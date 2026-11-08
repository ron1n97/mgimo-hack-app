import { NotFoundException } from '@nestjs/common';
import { assertResourceOwner, canAccessOwnOrStaff } from './ownership';

describe('request ownership (IDOR-safe)', () => {
  it('allows owner to access own resource', () => {
    expect(() =>
      assertResourceOwner({
        resourceOwnerId: 'user-a',
        actorUserId: 'user-a',
        actorRole: 'STUDENT',
      }),
    ).not.toThrow();
  });

  it('hides foreign resource from student (NotFound, not Forbidden)', () => {
    expect(() =>
      assertResourceOwner({
        resourceOwnerId: 'user-a',
        actorUserId: 'user-b',
        actorRole: 'STUDENT',
      }),
    ).toThrow(NotFoundException);
  });

  it('allows staff to access any ticket', () => {
    expect(() =>
      assertResourceOwner({
        resourceOwnerId: 'user-a',
        actorUserId: 'staff-1',
        actorRole: 'STAFF',
      }),
    ).not.toThrow();
  });

  it('canAccessOwnOrStaff returns false for other students', () => {
    expect(canAccessOwnOrStaff('user-a', 'user-b', 'STUDENT')).toBe(false);
    expect(canAccessOwnOrStaff('user-a', 'user-a', 'STUDENT')).toBe(true);
    expect(canAccessOwnOrStaff('user-a', 'staff-1', 'ADMIN')).toBe(true);
  });

  it('throws NotFound when resource is missing', () => {
    expect(() =>
      assertResourceOwner({
        resourceOwnerId: null,
        actorUserId: 'user-a',
        actorRole: 'STUDENT',
      }),
    ).toThrow(NotFoundException);
  });
});
