import { ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService.demoLogin', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
  };
  const jwt = {
    sign: jest.fn().mockReturnValue('demo.jwt.token'),
  };

  let service: AuthService;
  const prevFlag = process.env.DEMO_QUICK_LOGIN;
  const prevNode = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(
      prisma as unknown as PrismaService,
      jwt as unknown as JwtService,
    );
  });

  afterEach(() => {
    if (prevFlag === undefined) delete process.env.DEMO_QUICK_LOGIN;
    else process.env.DEMO_QUICK_LOGIN = prevFlag;
    if (prevNode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevNode;
  });

  it('rejects when quick login is disabled', async () => {
    process.env.NODE_ENV = 'production';
    process.env.DEMO_QUICK_LOGIN = 'false';
    await expect(service.demoLogin({ personaId: 'student-anna' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('rejects unknown persona', async () => {
    process.env.DEMO_QUICK_LOGIN = 'true';
    await expect(
      service.demoLogin({ personaId: 'unknown-persona' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('issues the same JWT shape as normal login when enabled', async () => {
    process.env.DEMO_QUICK_LOGIN = 'true';
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'anna.risk@demo.local',
      role: Role.STUDENT,
      phoneE164: '+79001111111',
      telegramId: null,
      studentProfile: { fullName: 'Анна Рискова' },
      staffProfile: null,
    });

    const result = await service.demoLogin({ personaId: 'student-anna' });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'anna.risk@demo.local' },
      include: { studentProfile: true, staffProfile: true },
    });
    expect(jwt.sign).toHaveBeenCalledWith({
      sub: 'u1',
      email: 'anna.risk@demo.local',
      role: Role.STUDENT,
    });
    expect(result.accessToken).toBe('demo.jwt.token');
    expect(result.user.email).toBe('anna.risk@demo.local');
    expect(result.user.role).toBe(Role.STUDENT);
  });

  it('rejects when seeded user is missing', async () => {
    process.env.DEMO_QUICK_LOGIN = 'true';
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.demoLogin({ personaId: 'student-anna' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
