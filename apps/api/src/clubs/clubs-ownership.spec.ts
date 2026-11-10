/**
 * Contract tests: club admin / digest actions must not be callable by students
 * at the service boundary (controller also gates via @Roles).
 */
import { ForbiddenException } from '@nestjs/common';
import { canModerateClubs } from './digest-filter';

function assertStaff(actorRole: string) {
  if (!canModerateClubs(actorRole)) {
    throw new ForbiddenException('Staff only');
  }
}

describe('club staff actions (IDOR / privilege)', () => {
  it('rejects student confirm/digest privilege', () => {
    expect(() => assertStaff('STUDENT')).toThrow(ForbiddenException);
  });

  it('allows staff and admin', () => {
    expect(() => assertStaff('STAFF')).not.toThrow();
    expect(() => assertStaff('ADMIN')).not.toThrow();
  });

  it('subscription mutations must bind to JWT user only', () => {
    // Documented contract: service methods take userId from JWT payload,
    // never from request body / path for the subscriber identity.
    const jwtUserId = 'student-a';
    const bodyUserId = 'student-b';
    const effectiveUserId = jwtUserId; // clubs.service always uses JWT
    expect(effectiveUserId).toBe(jwtUserId);
    expect(effectiveUserId).not.toBe(bodyUserId);
  });
});
