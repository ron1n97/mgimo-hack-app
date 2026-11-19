import type { ScheduleLesson, TeacherProfile } from '@prisma/client';
import { buildMeoWeekSlots } from './meo-grid';
import type {
  SolverActivity,
  SolverInstance,
  SolverRoom,
  SolverTeacher,
} from './solver-types';

function cohortIdOf(lesson: ScheduleLesson): string {
  if (lesson.subGroupOid) return `sub:${lesson.subGroupOid}`;
  return `group:${lesson.groupRuzId}`;
}

/**
 * Build a solve instance from a week of RUZ/local lessons for selected groups.
 * Activities = lessons to re-place; rooms/teachers mined from the same week + profiles.
 */
export function buildInstanceFromLessons(input: {
  lessons: ScheduleLesson[];
  teachers: Array<Pick<TeacherProfile, 'userId' | 'fullName' | 'department'>>;
  lambdas?: SolverInstance['lambdas'];
}): SolverInstance {
  const slots = buildMeoWeekSlots(5);
  const roomMap = new Map<string, SolverRoom>();
  for (const l of input.lessons) {
    const label = (l.auditorium || 'не задана').trim();
    const id = `room:${label.toLowerCase()}`;
    if (!roomMap.has(id)) {
      const isVirtual =
        /online|онлайн|zoom|teams|virtual/i.test(label) || label === 'не задана';
      roomMap.set(id, {
        id,
        label,
        capacity: isVirtual ? 999 : 40,
        building: isVirtual ? 'virtual' : /ДА|да\b/.test(label) ? 'DA' : 'campus',
        isVirtual,
      });
    }
  }
  if (roomMap.size === 0) {
    roomMap.set('room:101', {
      id: 'room:101',
      label: '101',
      capacity: 40,
      building: 'campus',
    });
  }
  roomMap.set('room:virtual', {
    id: 'room:virtual',
    label: 'online',
    capacity: 999,
    building: 'virtual',
    isVirtual: true,
  });

  const teachers: SolverTeacher[] = input.teachers.map((t) => ({
    id: t.userId,
    name: t.fullName,
    dept: t.department,
    workloadCap: 48,
  }));
  // Fallback synthetic teachers from lecturer strings
  for (const l of input.lessons) {
    const name = (l.lecturer || '').trim();
    if (!name) continue;
    const id = `lect:${name.toLowerCase()}`;
    if (!teachers.some((t) => t.id === id || t.name === name)) {
      teachers.push({ id, name, dept: null, workloadCap: 48 });
    }
  }
  if (teachers.length === 0) {
    teachers.push({ id: 't:demo', name: 'Преподаватель', workloadCap: 48 });
  }

  const activities: SolverActivity[] = input.lessons.map((l) => {
    const lecturer = (l.lecturer || '').trim();
    const eligible = lecturer
      ? teachers
          .filter((t) => t.name === lecturer || t.id === `lect:${lecturer.toLowerCase()}`)
          .map((t) => t.id)
      : teachers.map((t) => t.id);
    return {
      id: `act:${l.id}`,
      cohortId: cohortIdOf(l),
      discipline: l.discipline,
      kind: l.kindOfWork || 'sem',
      headcount: 20,
      dept: null,
      eligibleTeacherIds: eligible.length ? eligible : teachers.map((t) => t.id),
      sourceLessonId: l.id,
    };
  });

  // Language subgroups of the same academic group do not conflict (ADR 0011 A2).
  // Whole-group cohorts conflict with their language atoms.
  const cohortConflicts: Array<[string, string]> = [];
  const byGroup = new Map<string, string[]>();
  for (const l of input.lessons) {
    const c = cohortIdOf(l);
    const list = byGroup.get(l.groupRuzId) ?? [];
    if (!list.includes(c)) list.push(c);
    byGroup.set(l.groupRuzId, list);
  }
  for (const [, cohorts] of byGroup) {
    const whole = cohorts.filter((c) => c.startsWith('group:'));
    const subs = cohorts.filter((c) => c.startsWith('sub:'));
    for (const w of whole) {
      for (const s of subs) cohortConflicts.push([w, s]);
    }
  }

  return {
    slots,
    rooms: [...roomMap.values()],
    teachers,
    activities,
    cohortConflicts,
    lambdas: input.lambdas,
  };
}
