import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

describe('NotificationsService.markRead', () => {
  const prisma = {
    notification: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  const dispatcher = { dispatch: jest.fn() };
  const service = new NotificationsService(
    prisma as never,
    dispatcher as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('marks unread notification owned by actor', async () => {
    const row = {
      id: 'n1',
      userId: 'u1',
      title: 't',
      body: 'b',
      kind: 'deanery_announce',
      readAt: null,
      createdAt: new Date(),
    };
    prisma.notification.findUnique.mockResolvedValue(row);
    prisma.notification.update.mockResolvedValue({
      ...row,
      readAt: new Date('2026-11-22T10:00:00Z'),
    });

    const out = await service.markRead('n1', 'u1', 'STUDENT');
    expect(prisma.notification.update).toHaveBeenCalledWith({
      where: { id: 'n1' },
      data: { readAt: expect.any(Date) },
    });
    expect(out.readAt).toBeTruthy();
  });

  it('is idempotent when already read', async () => {
    const row = {
      id: 'n1',
      userId: 'u1',
      title: 't',
      body: 'b',
      kind: 'grade_posted',
      readAt: new Date('2026-11-20T10:00:00Z'),
      createdAt: new Date(),
    };
    prisma.notification.findUnique.mockResolvedValue(row);

    const out = await service.markRead('n1', 'u1', 'STUDENT');
    expect(prisma.notification.update).not.toHaveBeenCalled();
    expect(out.readAt).toEqual(row.readAt);
  });

  it('hides foreign notification from student (IDOR)', async () => {
    prisma.notification.findUnique.mockResolvedValue({
      id: 'n1',
      userId: 'other',
      title: 't',
      body: 'b',
      kind: 'x',
      readAt: null,
      createdAt: new Date(),
    });
    await expect(service.markRead('n1', 'u1', 'STUDENT')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.notification.update).not.toHaveBeenCalled();
  });
});
