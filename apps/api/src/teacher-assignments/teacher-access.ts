import { ForbiddenException, NotFoundException } from '@nestjs/common';

/**
 * IDOR: teacher may mutate only own lesson assignments / tasks.
 * Staff/admin may always access (dean overlay).
 */
export function assertTeacherOwnsResource(params: {
  ownerTeacherUserId: string | null | undefined;
  actorUserId: string;
  actorRole: string;
  notFoundMessage?: string;
}): void {
  const { ownerTeacherUserId, actorUserId, actorRole, notFoundMessage } =
    params;

  if (!ownerTeacherUserId) {
    throw new NotFoundException(notFoundMessage ?? 'Resource not found');
  }

  const isStaff = actorRole === 'STAFF' || actorRole === 'ADMIN';
  if (ownerTeacherUserId !== actorUserId && !isStaff) {
    throw new NotFoundException(notFoundMessage ?? 'Resource not found');
  }
}

/** Student visibility: task group must match student's groupRuzId. */
export function assertStudentSeesTaskGroup(params: {
  taskGroupRuzId: string;
  studentGroupRuzId: string | null | undefined;
}): void {
  const { taskGroupRuzId, studentGroupRuzId } = params;
  if (!studentGroupRuzId || studentGroupRuzId !== taskGroupRuzId) {
    throw new ForbiddenException('Task not visible for your group');
  }
}

export function canStudentSeeTask(
  taskGroupRuzId: string,
  studentGroupRuzId: string | null | undefined,
): boolean {
  return Boolean(studentGroupRuzId && studentGroupRuzId === taskGroupRuzId);
}

export function isTeacherRole(role: string): boolean {
  return role === 'TEACHER';
}

export function isDeanOrchestrator(role: string): boolean {
  return role === 'STAFF' || role === 'ADMIN';
}
