import { slotsOverlap } from './meo-grid';
import {
  DEFAULT_LAMBDAS,
  type SoftBreakdown,
  type SoftLambdas,
  type SolverActivity,
  type SolverAssignment,
  type SolverInstance,
  type SolverRoom,
  type SolverSlot,
  type SolverTeacher,
} from './solver-types';

function indexById<T extends { id: string }>(rows: T[]): Map<string, T> {
  return new Map(rows.map((r) => [r.id, r]));
}

export type HardViolation = {
  code: string;
  detail: string;
};

export function findHardViolations(
  instance: SolverInstance,
  assignments: SolverAssignment[],
): HardViolation[] {
  const slots = indexById(instance.slots);
  const rooms = indexById(instance.rooms);
  const teachers = indexById(instance.teachers);
  const activities = indexById(instance.activities);
  const byAct = new Map(assignments.map((a) => [a.activityId, a]));
  const out: HardViolation[] = [];

  for (const act of instance.activities) {
    if (!byAct.has(act.id)) {
      out.push({ code: 'H1', detail: `unassigned ${act.id}` });
    }
  }
  if (assignments.length !== new Set(assignments.map((a) => a.activityId)).size) {
    out.push({ code: 'H1', detail: 'duplicate activity assignment' });
  }

  const conflictSet = new Set(
    instance.cohortConflicts.flatMap(([a, b]) => [`${a}|${b}`, `${b}|${a}`]),
  );

  for (let i = 0; i < assignments.length; i += 1) {
    for (let j = i + 1; j < assignments.length; j += 1) {
      const A = assignments[i];
      const B = assignments[j];
      const sA = slots.get(A.slotId);
      const sB = slots.get(B.slotId);
      if (!sA || !sB || !slotsOverlap(sA, sB)) continue;
      if (A.teacherId === B.teacherId) {
        out.push({
          code: 'H2',
          detail: `teacher ${A.teacherId} clash ${A.activityId}/${B.activityId}`,
        });
      }
      const rA = rooms.get(A.roomId);
      const rB = rooms.get(B.roomId);
      if (A.roomId === B.roomId && !rA?.isVirtual && !rB?.isVirtual) {
        out.push({
          code: 'H3',
          detail: `room ${A.roomId} clash ${A.activityId}/${B.activityId}`,
        });
      }
      const actA = activities.get(A.activityId);
      const actB = activities.get(B.activityId);
      if (actA && actB) {
        if (actA.cohortId === actB.cohortId) {
          out.push({
            code: 'H4',
            detail: `cohort ${actA.cohortId} clash`,
          });
        } else if (conflictSet.has(`${actA.cohortId}|${actB.cohortId}`)) {
          out.push({
            code: 'H4',
            detail: `cohort conflict ${actA.cohortId}/${actB.cohortId}`,
          });
        }
      }
    }
  }

  for (const asg of assignments) {
    const act = activities.get(asg.activityId);
    const room = rooms.get(asg.roomId);
    const teacher = teachers.get(asg.teacherId);
    if (!act || !room || !teacher) {
      out.push({ code: 'H7', detail: `missing entity for ${asg.activityId}` });
      continue;
    }
    if (!room.isVirtual && room.capacity < act.headcount) {
      out.push({
        code: 'H5',
        detail: `cap ${room.id} < headcount ${act.headcount}`,
      });
    }
    if (
      act.eligibleTeacherIds?.length &&
      !act.eligibleTeacherIds.includes(asg.teacherId)
    ) {
      out.push({
        code: 'H8',
        detail: `teacher ${asg.teacherId} not eligible for ${act.id}`,
      });
    }
  }

  // H10: DA ↔ campus same day for teacher/cohort
  const dayBuildingsTeacher = new Map<string, Set<string>>();
  const dayBuildingsCohort = new Map<string, Set<string>>();
  for (const asg of assignments) {
    const slot = slots.get(asg.slotId);
    const room = rooms.get(asg.roomId);
    const act = activities.get(asg.activityId);
    if (!slot || !room || !act || room.building === 'virtual') continue;
    const tKey = `${asg.teacherId}|${slot.day}`;
    const cKey = `${act.cohortId}|${slot.day}`;
    if (!dayBuildingsTeacher.has(tKey)) dayBuildingsTeacher.set(tKey, new Set());
    if (!dayBuildingsCohort.has(cKey)) dayBuildingsCohort.set(cKey, new Set());
    dayBuildingsTeacher.get(tKey)!.add(room.building);
    dayBuildingsCohort.get(cKey)!.add(room.building);
  }
  for (const [key, set] of dayBuildingsTeacher) {
    if (set.has('DA') && set.has('campus')) {
      out.push({ code: 'H10', detail: `teacher DA+campus ${key}` });
    }
  }
  for (const [key, set] of dayBuildingsCohort) {
    if (set.has('DA') && set.has('campus')) {
      out.push({ code: 'H10', detail: `cohort DA+campus ${key}` });
    }
  }

  return out;
}

function gapPenalty(
  dayOrds: number[],
): number {
  if (dayOrds.length <= 1) return 0;
  const sorted = [...dayOrds].sort((a, b) => a - b);
  return sorted[sorted.length - 1] - sorted[0] + 1 - sorted.length;
}

export function scoreSoft(
  instance: SolverInstance,
  assignments: SolverAssignment[],
  lambdas: SoftLambdas = { ...DEFAULT_LAMBDAS, ...instance.lambdas },
): SoftBreakdown {
  const slots = indexById(instance.slots);
  const rooms = indexById(instance.rooms);
  const teachers = indexById(instance.teachers);
  const activities = indexById(instance.activities);

  const teachDayOrds = new Map<string, number[]>();
  const cohortDayOrds = new Map<string, number[]>();
  const teachLoad = new Map<string, number>();
  const teachDayBld = new Map<string, Set<string>>();
  let dept = 0;

  for (const asg of assignments) {
    const slot = slots.get(asg.slotId);
    const room = rooms.get(asg.roomId);
    const act = activities.get(asg.activityId);
    const teacher = teachers.get(asg.teacherId);
    if (!slot || !room || !act || !teacher) continue;

    const td = `${asg.teacherId}|${slot.day}`;
    const cd = `${act.cohortId}|${slot.day}`;
    if (!teachDayOrds.has(td)) teachDayOrds.set(td, []);
    if (!cohortDayOrds.has(cd)) cohortDayOrds.set(cd, []);
    teachDayOrds.get(td)!.push(slot.ord);
    cohortDayOrds.get(cd)!.push(slot.ord);
    teachLoad.set(asg.teacherId, (teachLoad.get(asg.teacherId) ?? 0) + 2);

    if (act.dept && teacher.dept && act.dept !== teacher.dept) dept += 1;

    if (room.building === 'campus' || room.building === 'DA') {
      if (!teachDayBld.has(td)) teachDayBld.set(td, new Set());
      teachDayBld.get(td)!.add(room.label.split(/\s+/)[0] ?? room.id);
    }
  }

  let gapTeach = 0;
  for (const ords of teachDayOrds.values()) gapTeach += gapPenalty(ords);
  let gapStud = 0;
  for (const ords of cohortDayOrds.values()) gapStud += gapPenalty(ords);

  let load = 0;
  for (const t of instance.teachers) {
    const used = teachLoad.get(t.id) ?? 0;
    const cap = t.workloadCap ?? 40;
    if (used > cap) load += used - cap;
  }

  let building = 0;
  for (const set of teachDayBld.values()) {
    if (set.size >= 2) building += 1;
  }

  const total =
    lambdas.gapTeach * gapTeach +
    lambdas.load * load +
    lambdas.dept * dept +
    lambdas.gapStud * gapStud +
    lambdas.building * building;

  return { gapTeach, load, dept, gapStud, building, total };
}

export function isFeasibleDomain(
  act: SolverActivity,
  slot: SolverSlot,
  room: SolverRoom,
  teacher: SolverTeacher,
): boolean {
  if (!room.isVirtual && room.capacity < act.headcount) return false;
  if (act.eligibleTeacherIds?.length && !act.eligibleTeacherIds.includes(teacher.id)) {
    return false;
  }
  void slot;
  return true;
}
