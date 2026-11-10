import { ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  assertStudentSeesTaskGroup,
  assertTeacherOwnsResource,
  canStudentSeeTask,
  isDeanOrchestrator,
  isTeacherRole,
} from './teacher-access';

describe('assertTeacherOwnsResource (IDOR)', () => {
  it('allows teacher who owns the assignment', () => {
    expect(() =>
      assertTeacherOwnsResource({
        ownerTeacherUserId: 't1',
        actorUserId: 't1',
        actorRole: 'TEACHER',
      }),
    ).not.toThrow();
  });

  it('hides foreign teacher resource as NotFound', () => {
    expect(() =>
      assertTeacherOwnsResource({
        ownerTeacherUserId: 't1',
        actorUserId: 't2',
        actorRole: 'TEACHER',
      }),
    ).toThrow(NotFoundException);
  });

  it('allows staff/admin to access any teacher resource', () => {
    expect(() =>
      assertTeacherOwnsResource({
        ownerTeacherUserId: 't1',
        actorUserId: 'staff-1',
        actorRole: 'STAFF',
      }),
    ).not.toThrow();
  });

  it('throws when owner missing', () => {
    expect(() =>
      assertTeacherOwnsResource({
        ownerTeacherUserId: null,
        actorUserId: 't1',
        actorRole: 'TEACHER',
      }),
    ).toThrow(NotFoundException);
  });
});

describe('student task visibility', () => {
  it('allows matching groupRuzId', () => {
    expect(canStudentSeeTask('8033', '8033')).toBe(true);
    expect(() =>
      assertStudentSeesTaskGroup({
        taskGroupRuzId: '8033',
        studentGroupRuzId: '8033',
      }),
    ).not.toThrow();
  });

  it('blocks other groups and missing profile group', () => {
    expect(canStudentSeeTask('8033', '8035')).toBe(false);
    expect(canStudentSeeTask('8033', null)).toBe(false);
    expect(() =>
      assertStudentSeesTaskGroup({
        taskGroupRuzId: '8033',
        studentGroupRuzId: '8035',
      }),
    ).toThrow(ForbiddenException);
  });
});

describe('role helpers', () => {
  it('detects teacher and dean roles', () => {
    expect(isTeacherRole('TEACHER')).toBe(true);
    expect(isTeacherRole('STAFF')).toBe(false);
    expect(isDeanOrchestrator('STAFF')).toBe(true);
    expect(isDeanOrchestrator('ADMIN')).toBe(true);
    expect(isDeanOrchestrator('TEACHER')).toBe(false);
  });
});
