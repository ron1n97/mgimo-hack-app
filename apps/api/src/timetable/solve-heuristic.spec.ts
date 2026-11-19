import { buildMeoWeekSlots } from './meo-grid';
import { findHardViolations, scoreSoft } from './score';
import { solveHeuristic } from './solve-heuristic';
import type { SolverInstance } from './solver-types';

function tinyInstance(): SolverInstance {
  const slots = buildMeoWeekSlots(2).slice(0, 6); // Mon+Tue first pairs
  return {
    slots,
    rooms: [
      {
        id: 'r1',
        label: '101',
        capacity: 30,
        building: 'campus',
      },
      {
        id: 'r2',
        label: '202',
        capacity: 30,
        building: 'campus',
      },
      {
        id: 'virt',
        label: 'online',
        capacity: 999,
        building: 'virtual',
        isVirtual: true,
      },
    ],
    teachers: [
      { id: 't1', name: 'Иванов', dept: 'МП' },
      { id: 't2', name: 'Петров', dept: 'ИЯ' },
    ],
    activities: [
      {
        id: 'a1',
        cohortId: 'c-en',
        discipline: 'Английский',
        kind: 'sem',
        headcount: 15,
        dept: 'ИЯ',
        eligibleTeacherIds: ['t2'],
      },
      {
        id: 'a2',
        cohortId: 'c-en',
        discipline: 'Английский',
        kind: 'sem',
        headcount: 15,
        dept: 'ИЯ',
        eligibleTeacherIds: ['t2'],
      },
      {
        id: 'a3',
        cohortId: 'c-law',
        discipline: 'Международное право',
        kind: 'lec',
        headcount: 25,
        dept: 'МП',
        eligibleTeacherIds: ['t1'],
      },
    ],
    // language subgroups of same academic group do NOT conflict
    cohortConflicts: [],
    lambdas: { gapTeach: 10, dept: 5, gapStud: 3, load: 1, building: 1 },
  };
}

describe('timetable heuristic solver (ADR 0011)', () => {
  it('finds a feasible assignment with no hard violations', () => {
    const instance = tinyInstance();
    const result = solveHeuristic(instance, { maxNodes: 50_000, timeBudgetMs: 3000 });
    expect(result.status).toBe('FEASIBLE');
    expect(result.assignments).toHaveLength(3);
    expect(findHardViolations(instance, result.assignments)).toEqual([]);
  });

  it('never double-books the same teacher on overlapping slots', () => {
    const instance = tinyInstance();
    // Force both English sessions + law onto one teacher → still feasible via different slots
    instance.activities.forEach((a) => {
      a.eligibleTeacherIds = ['t1', 't2'];
    });
    const result = solveHeuristic(instance, { maxNodes: 80_000, timeBudgetMs: 4000 });
    expect(result.status).toBe('FEASIBLE');
    expect(findHardViolations(instance, result.assignments)).toEqual([]);
  });

  it('returns INFEASIBLE when capacity cannot fit', () => {
    const instance = tinyInstance();
    instance.rooms = instance.rooms
      .filter((r) => !r.isVirtual)
      .map((r) => ({ ...r, capacity: 1 }));
    instance.activities[0].headcount = 50;
    instance.activities[0].eligibleTeacherIds = ['t2'];
    const result = solveHeuristic(instance, { maxNodes: 20_000, timeBudgetMs: 1500 });
    expect(result.status).toBe('INFEASIBLE');
  });

  it('soft score prefers matching department when feasible', () => {
    const instance = tinyInstance();
    const result = solveHeuristic(instance, { maxNodes: 50_000, timeBudgetMs: 3000 });
    expect(result.status).toBe('FEASIBLE');
    const soft = scoreSoft(instance, result.assignments);
    // a1/a2 must use t2 (ИЯ); a3 uses t1 (МП) → dept penalty 0
    expect(soft.dept).toBe(0);
  });
});
