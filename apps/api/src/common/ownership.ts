import { ForbiddenException, NotFoundException } from '@nestjs/common';

/**
 * IDOR-safe ownership check for student-scoped resources.
 * Returns true when the actor owns the resource or is staff/admin.
 */
export function assertResourceOwner(params: {
  resourceOwnerId: string | null | undefined;
  actorUserId: string;
  actorRole: string;
  notFoundMessage?: string;
}): void {
  const { resourceOwnerId, actorUserId, actorRole, notFoundMessage } = params;

  if (!resourceOwnerId) {
    throw new NotFoundException(notFoundMessage ?? 'Resource not found');
  }

  const isStaff = actorRole === 'STAFF' || actorRole === 'ADMIN';
  if (resourceOwnerId !== actorUserId && !isStaff) {
    // Hide existence from non-owners (IDOR mitigation)
    throw new NotFoundException(notFoundMessage ?? 'Resource not found');
  }
}

export function canAccessOwnOrStaff(
  resourceOwnerId: string,
  actorUserId: string,
  actorRole: string,
): boolean {
  if (resourceOwnerId === actorUserId) return true;
  return actorRole === 'STAFF' || actorRole === 'ADMIN';
}
