import { findHardViolations, isFeasibleDomain, scoreSoft } from './score';
import {
  DEFAULT_LAMBDAS,
  type SolverActivity,
  type SolverAssignment,
  type SolverInstance,
  type SolverResult,
  type SolverRoom,
  type SolverSlot,
  type SolverTeacher,
} from './solver-types';
import { slotsOverlap } from './meo-grid';

type PartialState = {
  assignments: SolverAssignment[];
  teacherBusy: Map<string, string[]>; // teacherId -> slotIds
  roomBusy: Map<string, string[]>;
  cohortBusy: Map<string, string[]>;
};

function cloneState(s: PartialState): PartialState {
  return {
    assignments: [...s.assignments],
    teacherBusy: new Map(
      [...s.teacherBusy.entries()].map(([k, v]) => [k, [...v]]),
    ),
    roomBusy: new Map([...s.roomBusy.entries()].map(([k, v]) => [k, [...v]])),
    cohortBusy: new Map(
      [...s.cohortBusy.entries()].map(([k, v]) => [k, [...v]]),
    ),
  };
}

function slotById(instance: SolverInstance): Map<string, SolverSlot> {
  return new Map(instance.slots.map((s) => [s.id, s]));
}

function conflictsWithBusy(
  slotMap: Map<string, SolverSlot>,
  busySlotIds: string[] | undefined,
  slot: SolverSlot,
): boolean {
  if (!busySlotIds?.length) return false;
  for (const id of busySlotIds) {
    const other = slotMap.get(id);
    if (other && slotsOverlap(slot, other)) return true;
  }
  return false;
}

function conflictSet(instance: SolverInstance): Set<string> {
  return new Set(
    instance.cohortConflicts.flatMap(([a, b]) => [`${a}|${b}`, `${b}|${a}`]),
  );
}

function canPlace(
  instance: SolverInstance,
  state: PartialState,
  act: SolverActivity,
  slot: SolverSlot,
  room: SolverRoom,
  teacher: SolverTeacher,
  slots: Map<string, SolverSlot>,
  conflicts: Set<string>,
): boolean {
  if (!isFeasibleDomain(act, slot, room, teacher)) return false;
  if (conflictsWithBusy(slots, state.teacherBusy.get(teacher.id), slot)) {
    return false;
  }
  if (
    !room.isVirtual &&
    conflictsWithBusy(slots, state.roomBusy.get(room.id), slot)
  ) {
    return false;
  }
  if (conflictsWithBusy(slots, state.cohortBusy.get(act.cohortId), slot)) {
    return false;
  }
  for (const [cohortId, busy] of state.cohortBusy) {
    if (cohortId === act.cohortId) continue;
    if (!conflicts.has(`${act.cohortId}|${cohortId}`)) continue;
    if (conflictsWithBusy(slots, busy, slot)) return false;
  }
  // H10 preview: if teacher/cohort already has DA/campus opposite today
  const day = slot.day;
  if (room.building === 'DA' || room.building === 'campus') {
    for (const asg of state.assignments) {
      const s = slots.get(asg.slotId);
      if (!s || s.day !== day) continue;
      const r = instance.rooms.find((x) => x.id === asg.roomId);
      if (!r || r.building === 'virtual') continue;
      if (asg.teacherId === teacher.id && r.building !== room.building) {
        if (
          (r.building === 'DA' && room.building === 'campus') ||
          (r.building === 'campus' && room.building === 'DA')
        ) {
          return false;
        }
      }
      const otherAct = instance.activities.find((a) => a.id === asg.activityId);
      if (
        otherAct?.cohortId === act.cohortId &&
        r.building !== room.building &&
        ((r.building === 'DA' && room.building === 'campus') ||
          (r.building === 'campus' && room.building === 'DA'))
      ) {
        return false;
      }
    }
  }
  return true;
}

function place(
  state: PartialState,
  asg: SolverAssignment,
  act: SolverActivity,
): void {
  state.assignments.push(asg);
  const push = (map: Map<string, string[]>, key: string, slotId: string) => {
    const arr = map.get(key) ?? [];
    arr.push(slotId);
    map.set(key, arr);
  };
  push(state.teacherBusy, asg.teacherId, asg.slotId);
  push(state.roomBusy, asg.roomId, asg.slotId);
  push(state.cohortBusy, act.cohortId, asg.slotId);
}

function candidateScore(
  instance: SolverInstance,
  state: PartialState,
  act: SolverActivity,
  slot: SolverSlot,
  room: SolverRoom,
  teacher: SolverTeacher,
): number {
  const trial = cloneState(state);
  place(trial, {
    activityId: act.id,
    slotId: slot.id,
    roomId: room.id,
    teacherId: teacher.id,
  }, act);
  return scoreSoft(instance, trial.assignments).total;
}

/**
 * Constructive backtracking with MRV + soft lookahead (ADR 0011 heuristic engine).
 * Guarantees hard feasibility when a solution exists in the search budget.
 */
export function solveHeuristic(
  instance: SolverInstance,
  opts?: { maxNodes?: number; timeBudgetMs?: number },
): SolverResult {
  const started = Date.now();
  const maxNodes = opts?.maxNodes ?? 250_000;
  const timeBudgetMs = opts?.timeBudgetMs ?? 8_000;
  const slots = slotById(instance);
  const conflicts = conflictSet(instance);
  const lambdas = { ...DEFAULT_LAMBDAS, ...instance.lambdas };

  const order = [...instance.activities].sort((a, b) => {
    const ea = a.eligibleTeacherIds?.length ?? instance.teachers.length;
    const eb = b.eligibleTeacherIds?.length ?? instance.teachers.length;
    return ea - eb || b.headcount - a.headcount;
  });

  let nodes = 0;
  let best: SolverAssignment[] | null = null;
  let bestSoft = Number.POSITIVE_INFINITY;

  const dfs = (idx: number, state: PartialState): boolean => {
    nodes += 1;
    if (nodes > maxNodes) return false;
    if (Date.now() - started > timeBudgetMs) return false;
    if (idx >= order.length) {
      const soft = scoreSoft(instance, state.assignments, lambdas).total;
      if (soft < bestSoft) {
        bestSoft = soft;
        best = [...state.assignments];
      }
      return true;
    }
    const act = order[idx];
    type Cand = {
      slot: SolverSlot;
      room: SolverRoom;
      teacher: SolverTeacher;
      soft: number;
    };
    const cands: Cand[] = [];
    for (const slot of instance.slots) {
      for (const room of instance.rooms) {
        for (const teacher of instance.teachers) {
          if (
            !canPlace(
              instance,
              state,
              act,
              slot,
              room,
              teacher,
              slots,
              conflicts,
            )
          ) {
            continue;
          }
          cands.push({
            slot,
            room,
            teacher,
            soft: candidateScore(instance, state, act, slot, room, teacher),
          });
        }
      }
    }
    cands.sort((a, b) => a.soft - b.soft);
    // Cap branching for speed on larger instances
    const limited = cands.slice(0, Math.min(40, cands.length));
    for (const c of limited) {
      const next = cloneState(state);
      place(
        next,
        {
          activityId: act.id,
          slotId: c.slot.id,
          roomId: c.room.id,
          teacherId: c.teacher.id,
        },
        act,
      );
      if (dfs(idx + 1, next)) {
        // keep searching for better soft within budget
        if (Date.now() - started > timeBudgetMs || nodes > maxNodes) {
          return true;
        }
      }
    }
    return best != null;
  };

  dfs(0, {
    assignments: [],
    teacherBusy: new Map(),
    roomBusy: new Map(),
    cohortBusy: new Map(),
  });

  const elapsedMs = Date.now() - started;
  if (!best) {
    return {
      status: 'INFEASIBLE',
      engine: 'heuristic',
      assignments: [],
      objective: Number.POSITIVE_INFINITY,
      soft: {
        gapTeach: 0,
        load: 0,
        dept: 0,
        gapStud: 0,
        building: 0,
        total: Number.POSITIVE_INFINITY,
      },
      message: `No feasible assignment within budget (nodes=${nodes})`,
      elapsedMs,
    };
  }

  const hard = findHardViolations(instance, best);
  if (hard.length) {
    return {
      status: 'ERROR',
      engine: 'heuristic',
      assignments: best,
      objective: Number.POSITIVE_INFINITY,
      soft: scoreSoft(instance, best, lambdas),
      message: `Internal hard violations: ${hard.map((h) => h.code).join(',')}`,
      elapsedMs,
    };
  }

  const soft = scoreSoft(instance, best, lambdas);
  return {
    status: 'FEASIBLE',
    engine: 'heuristic',
    assignments: best,
    objective: soft.total,
    soft,
    elapsedMs,
  };
}
