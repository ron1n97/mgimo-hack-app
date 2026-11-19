/** Instance / solution types aligned with ADR 0011 (timetable model v1). */

export type SoftLambdas = {
  gapTeach: number;
  load: number;
  dept: number;
  gapStud: number;
  building: number;
};

export const DEFAULT_LAMBDAS: SoftLambdas = {
  gapTeach: 10,
  load: 5,
  dept: 8,
  gapStud: 3,
  building: 2,
};

export type SolverSlot = {
  id: string;
  day: number; // 0=Mon … 4=Fri
  ord: number; // pair index within day
  startMin: number; // minutes from week Monday 00:00
  endMin: number;
  grid: 'MEO' | 'MO';
};

export type SolverRoom = {
  id: string;
  label: string;
  capacity: number;
  building: 'campus' | 'DA' | 'virtual';
  isVirtual?: boolean;
};

export type SolverTeacher = {
  id: string;
  name: string;
  dept?: string | null;
  /** Academic-hour budget for the horizon (default generous). */
  workloadCap?: number;
};

export type SolverActivity = {
  id: string;
  cohortId: string;
  discipline: string;
  kind: string;
  /** Headcount for capacity check. */
  headcount: number;
  dept?: string | null;
  /** Preferred teacher ids (eligibility); empty = any. */
  eligibleTeacherIds?: string[];
  /** Source ScheduleLesson id when re-optimizing a week. */
  sourceLessonId?: string;
};

export type SolverInstance = {
  slots: SolverSlot[];
  rooms: SolverRoom[];
  teachers: SolverTeacher[];
  activities: SolverActivity[];
  /** Undirected cohort conflict pairs (same students). */
  cohortConflicts: Array<[string, string]>;
  lambdas?: Partial<SoftLambdas>;
};

export type SolverAssignment = {
  activityId: string;
  slotId: string;
  roomId: string;
  teacherId: string;
};

export type SoftBreakdown = {
  gapTeach: number;
  load: number;
  dept: number;
  gapStud: number;
  building: number;
  total: number;
};

export type SolverResult = {
  status: 'FEASIBLE' | 'INFEASIBLE' | 'ERROR';
  engine: 'cpsat' | 'heuristic';
  assignments: SolverAssignment[];
  objective: number;
  soft: SoftBreakdown;
  message?: string;
  elapsedMs: number;
};
