import type { SolverSlot } from './solver-types';

/**
 * МЭО pair grid (ADR 0011 §2.4): 8 × 80 min, long lunch after pair 3.
 * Times are Moscow-local minutes from Monday 00:00 for day offset.
 */
const MEO_PAIR_STARTS = [
  9 * 60, // 09:00
  10 * 60 + 40, // 10:40
  12 * 60 + 20, // 12:20
  14 * 60 + 40, // 14:40 (after long lunch)
  16 * 60 + 20, // 16:20
  18 * 60, // 18:00
  19 * 60 + 40, // 19:40
  21 * 60 + 20, // 21:20
];

const PAIR_LEN = 80;

export function buildMeoWeekSlots(days = 5): SolverSlot[] {
  const slots: SolverSlot[] = [];
  for (let day = 0; day < days; day += 1) {
    for (let ord = 0; ord < MEO_PAIR_STARTS.length; ord += 1) {
      const startMin = day * 24 * 60 + MEO_PAIR_STARTS[ord];
      slots.push({
        id: `meo-d${day}-p${ord}`,
        day,
        ord,
        startMin,
        endMin: startMin + PAIR_LEN,
        grid: 'MEO',
      });
    }
  }
  return slots;
}

export function slotsOverlap(a: SolverSlot, b: SolverSlot): boolean {
  return a.startMin < b.endMin && b.startMin < a.endMin;
}
