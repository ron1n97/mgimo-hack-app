import { NotFoundException } from '@nestjs/common';
import { TeacherAssignmentsService } from './teacher-assignments.service';

type MockPrisma = {
  teacherProfile: { findUnique: jest.Mock };
  scheduleLesson: { findUnique: jest.Mock; findMany: jest.Mock };
  lessonTeacherAssignment: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    delete: jest.Mock;
  };
  lessonTask: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  studentProfile: { findUnique: jest.Mock };
  user: { findMany: jest.Mock };
};

function makeService(prisma: MockPrisma) {
  return new TeacherAssignmentsService(prisma as never);
}

describe('TeacherAssignmentsService IDOR / isolation', () => {
  let prisma: MockPrisma;
  let service: TeacherAssignmentsService;

  beforeEach(() => {
    prisma = {
      teacherProfile: { findUnique: jest.fn() },
      scheduleLesson: { findUnique: jest.fn(), findMany: jest.fn() },
      lessonTeacherAssignment: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      lessonTask: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      studentProfile: { findUnique: jest.fn() },
      user: { findMany: jest.fn() },
    };
    service = makeService(prisma);
  });

  it('createTask: foreign teacher cannot attach task to another assignment', async () => {
    prisma.lessonTeacherAssignment.findUnique.mockResolvedValue({
      id: 'a1',
      teacherUserId: 'teacher-owner',
      groupRuzId: '8033',
      scheduleLessonId: 'l1',
      scheduleLesson: { id: 'l1', groupRuzId: '8033' },
    });

    await expect(
      service.createTask('teacher-intruder', 'TEACHER', {
        assignmentId: 'a1',
        title: 'ДЗ',
        body: 'Прочитать главу 1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.lessonTask.create).not.toHaveBeenCalled();
  });

  it('createTask: owner teacher may create task', async () => {
    prisma.lessonTeacherAssignment.findUnique.mockResolvedValue({
      id: 'a1',
      teacherUserId: 'teacher-owner',
      groupRuzId: '8033',
      scheduleLessonId: 'l1',
      scheduleLesson: { id: 'l1', groupRuzId: '8033' },
    });
    prisma.lessonTask.create.mockResolvedValue({ id: 'task-1' });

    const result = await service.createTask('teacher-owner', 'TEACHER', {
      assignmentId: 'a1',
      title: 'ДЗ',
      body: 'Прочитать главу 1',
    });

    expect(result).toEqual({ id: 'task-1' });
    expect(prisma.lessonTask.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          groupRuzId: '8033',
          createdByUserId: 'teacher-owner',
          assignmentId: 'a1',
        }),
      }),
    );
  });

  it('updateTask / deleteTask: IDOR hides foreign tasks', async () => {
    prisma.lessonTask.findUnique.mockResolvedValue({
      id: 'task-1',
      assignment: { teacherUserId: 'teacher-owner' },
    });

    await expect(
      service.updateTask('task-1', 'teacher-other', 'TEACHER', {
        title: 'Hacked',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    await expect(
      service.deleteTask('task-1', 'teacher-other', 'TEACHER'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.lessonTask.update).not.toHaveBeenCalled();
    expect(prisma.lessonTask.delete).not.toHaveBeenCalled();
  });

  it('listStudentTasks: scopes by student groupRuzId only', async () => {
    prisma.studentProfile.findUnique.mockResolvedValue({
      groupRuzId: '8033',
    });
    prisma.lessonTask.findMany.mockResolvedValue([{ id: 't1' }]);

    const rows = await service.listStudentTasks('student-1');
    expect(rows).toEqual([{ id: 't1' }]);
    expect(prisma.lessonTask.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ groupRuzId: '8033' }),
      }),
    );
  });

  it('listStudentTasks: empty when student has no groupRuzId', async () => {
    prisma.studentProfile.findUnique.mockResolvedValue({ groupRuzId: null });
    const rows = await service.listStudentTasks('student-1');
    expect(rows).toEqual([]);
    expect(prisma.lessonTask.findMany).not.toHaveBeenCalled();
  });

  it('assignTeacher: staff can create assignment for teacher', async () => {
    prisma.teacherProfile.findUnique.mockResolvedValue({
      userId: 'teacher-1',
    });
    prisma.scheduleLesson.findUnique.mockResolvedValue({
      id: 'lesson-1',
      groupRuzId: '8033',
      groupLabel: '2МЭО-01',
      discipline: 'Международное право',
    });
    prisma.lessonTeacherAssignment.create.mockResolvedValue({ id: 'asg-1' });

    const result = await service.assignTeacher('staff-1', {
      teacherUserId: 'teacher-1',
      scheduleLessonId: 'lesson-1',
    });

    expect(result).toEqual({ id: 'asg-1' });
    expect(prisma.lessonTeacherAssignment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          teacherUserId: 'teacher-1',
          scheduleLessonId: 'lesson-1',
          groupRuzId: '8033',
          assignedByUserId: 'staff-1',
        }),
      }),
    );
  });
});
