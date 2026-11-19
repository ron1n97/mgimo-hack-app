import { BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';
import {
  assertProfileFieldsForRole,
  isStaffLike,
  listedPresentFields,
  STUDENT_ENROLLMENT_FIELDS,
  STUDENT_IMMUTABLE_FIELDS,
} from './profile-fields';

describe('profile fields by role', () => {
  it('lists only defined enrollment keys', () => {
    expect(
      listedPresentFields(
        { faculty: 'МО', course: 2, groupRuzId: '1' },
        STUDENT_ENROLLMENT_FIELDS,
      ),
    ).toEqual(['faculty', 'course']);
  });

  it('rejects student edits to enrollment and group binding fields', () => {
    expect(() =>
      assertProfileFieldsForRole(Role.STUDENT, {
        faculty: 'МО',
        program: 'бак',
        course: 3,
        groupRuzId: '8035',
        preferredSubGroupOids: ['501'],
      }),
    ).toThrow(BadRequestException);

    for (const key of STUDENT_IMMUTABLE_FIELDS) {
      expect(() =>
        assertProfileFieldsForRole(Role.STUDENT, {
          [key]: key === 'course' ? 2 : key === 'preferredSubGroupOids' ? ['1'] : 'x',
        }),
      ).toThrow(BadRequestException);
    }
  });

  it('rejects student edits to FIO and phone (deanery / bot surface removed)', () => {
    expect(() =>
      assertProfileFieldsForRole(Role.STUDENT, {
        fullName: 'Анна Рискова',
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      assertProfileFieldsForRole(Role.STUDENT, {
        phone: '+79001111111',
      }),
    ).toThrow(BadRequestException);
  });

  it('allows empty student patch (no writable self-service fields)', () => {
    expect(() => assertProfileFieldsForRole(Role.STUDENT, {})).not.toThrow();
  });

  it('rejects department on student profile', () => {
    expect(() =>
      assertProfileFieldsForRole(Role.STUDENT, { department: 'Деканат' }),
    ).toThrow(BadRequestException);
  });

  it('allows staff/admin schedule view group without course', () => {
    expect(() =>
      assertProfileFieldsForRole(Role.ADMIN, {
        groupRuzId: '8035',
        groupLabel: '2МЭО-02',
        department: 'Цифровой деканат',
        fullName: 'Админ',
      }),
    ).not.toThrow();
    expect(() =>
      assertProfileFieldsForRole(Role.STAFF, {
        groupRuzId: '8033',
        groupLabel: '1',
      }),
    ).not.toThrow();
  });

  it('rejects student enrollment fields for admin and staff', () => {
    expect(() =>
      assertProfileFieldsForRole(Role.ADMIN, { course: 2 }),
    ).toThrow(BadRequestException);
    expect(() =>
      assertProfileFieldsForRole(Role.STAFF, {
        faculty: 'МО',
        preferredSubGroupOids: ['1'],
      }),
    ).toThrow(BadRequestException);
  });

  it('marks staff-like roles', () => {
    expect(isStaffLike(Role.ADMIN)).toBe(true);
    expect(isStaffLike(Role.STAFF)).toBe(true);
    expect(isStaffLike(Role.STUDENT)).toBe(false);
  });

  it('rejects enrollment and view-group fields for teacher-like role string', () => {
    expect(() =>
      assertProfileFieldsForRole('TEACHER' as Role, { groupRuzId: '8033' }),
    ).toThrow(BadRequestException);
    expect(() =>
      assertProfileFieldsForRole('TEACHER' as Role, { course: 1 }),
    ).toThrow(BadRequestException);
    expect(() =>
      assertProfileFieldsForRole('TEACHER' as Role, {
        fullName: 'Иван Препод',
        department: 'Кафедра',
      }),
    ).not.toThrow();
  });
});
