import { BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';

/** Student enrollment / academic identity — not for staff oversight. */
export const STUDENT_ENROLLMENT_FIELDS = [
  'faculty',
  'program',
  'course',
  'preferredSubGroupOids',
] as const;

/**
 * Fields fixed in seed / registrar DB for students (Maxim + deanery feedback).
 * FIO, group and language subgroup are set by staff — not by the student.
 * Phone/bot linking removed from student self-service.
 */
export const STUDENT_IMMUTABLE_FIELDS = [
  ...STUDENT_ENROLLMENT_FIELDS,
  'groupLabel',
  'groupRuzId',
  'fullName',
] as const;

export type ProfileFieldPatch = {
  faculty?: string;
  program?: string;
  course?: number;
  groupLabel?: string;
  groupRuzId?: string;
  preferredSubGroupOids?: string[];
  department?: string;
  fullName?: string;
  phone?: string;
};

export function listedPresentFields(
  dto: ProfileFieldPatch,
  keys: readonly string[],
): string[] {
  return keys.filter((k) => (dto as Record<string, unknown>)[k] !== undefined);
}

/**
 * Role rules for PATCH /auth/me:
 * - STUDENT: no self-service academic identity (FIO/group/subgroup/enrollment);
 *   phone/bot field removed from product surface.
 * - STAFF/ADMIN: department + optional schedule view group (any catalog group);
 *   student enrollment is edited via /admin/students/:id, not PATCH /auth/me.
 * - TEACHER: contacts + department; no student enrollment / view-group.
 */
export function assertProfileFieldsForRole(
  role: Role,
  dto: ProfileFieldPatch,
): void {
  if (role === Role.STUDENT) {
    if (dto.department !== undefined) {
      throw new BadRequestException(
        'Поле department недоступно для профиля студента',
      );
    }
    if (dto.phone !== undefined) {
      throw new BadRequestException(
        'Телефон для бота отключён — вход только через web/demo',
      );
    }
    const forbidden = listedPresentFields(dto, STUDENT_IMMUTABLE_FIELDS);
    if (forbidden.length > 0) {
      throw new BadRequestException(
        `ФИО и академические поля задаёт деканат: ${forbidden.join(', ')}`,
      );
    }
    return;
  }

  // TEACHER: contacts only — no student enrollment and no schedule view-group.
  if ((role as string) === 'TEACHER') {
    const forbidden = listedPresentFields(dto, [
      ...STUDENT_ENROLLMENT_FIELDS,
      'groupRuzId',
      'groupLabel',
    ]);
    if (forbidden.length > 0) {
      throw new BadRequestException(
        `Поля студента / группы недоступны для роли TEACHER: ${forbidden.join(', ')}`,
      );
    }
    return;
  }

  // STAFF / ADMIN: oversight view group, not enrollment
  const forbidden = listedPresentFields(dto, STUDENT_ENROLLMENT_FIELDS);
  if (forbidden.length > 0) {
    throw new BadRequestException(
      `Поля студента недоступны для роли ${role}: ${forbidden.join(', ')}`,
    );
  }
}

export function isStaffLike(role: Role): boolean {
  return role === Role.STAFF || role === Role.ADMIN;
}
