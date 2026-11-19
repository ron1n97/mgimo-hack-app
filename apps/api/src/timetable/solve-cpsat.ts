import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { scoreSoft } from './score';
import { solveHeuristic } from './solve-heuristic';
import type { SolverInstance, SolverResult } from './solver-types';

function solverScriptPath(): string | null {
  const fromEnv = process.env.TIMETABLE_CPSAT_SCRIPT?.trim();
  const candidates = [
    fromEnv,
    path.resolve(process.cwd(), 'apps/solver/solve_cpsat.py'),
    path.resolve(process.cwd(), 'solver/solve_cpsat.py'),
    path.resolve(process.cwd(), '../solver/solve_cpsat.py'),
    path.resolve(__dirname, '../../../../solver/solve_cpsat.py'),
  ].filter((p): p is string => Boolean(p));
  return candidates.find((p) => existsSync(p)) ?? null;
}

/**
 * Prefer OR-Tools CP-SAT Python sidecar; fall back to in-process heuristic.
 */
export async function solveTimetable(
  instance: SolverInstance,
  opts?: { prefer?: 'cpsat' | 'heuristic' | 'auto'; timeBudgetMs?: number },
): Promise<SolverResult> {
  const prefer = opts?.prefer ?? 'auto';
  if (prefer === 'heuristic') {
    return solveHeuristic(instance, { timeBudgetMs: opts?.timeBudgetMs });
  }

  const cpsat = await tryCpSat(instance, opts?.timeBudgetMs);
  if (cpsat && cpsat.status === 'FEASIBLE') {
    // Recompute soft breakdown with shared scorer for UI consistency
    const soft = scoreSoft(instance, cpsat.assignments);
    return { ...cpsat, soft, objective: soft.total };
  }
  if (prefer === 'cpsat') {
    return (
      cpsat ?? {
        status: 'ERROR',
        engine: 'cpsat',
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
        message: 'CP-SAT unavailable',
        elapsedMs: 0,
      }
    );
  }
  return solveHeuristic(instance, { timeBudgetMs: opts?.timeBudgetMs });
}

function tryCpSat(
  instance: SolverInstance,
  timeBudgetMs?: number,
): Promise<SolverResult | null> {
  const script = solverScriptPath();
  if (!script) return Promise.resolve(null);
  const payload = {
    ...instance,
    timeLimitSec: Math.max(2, Math.floor((timeBudgetMs ?? 8000) / 1000)),
  };
  return new Promise((resolve) => {
    const child = spawn('python3', [script], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve(null);
    }, (timeBudgetMs ?? 8000) + 2000);

    child.stdout.on('data', (d) => {
      stdout += String(d);
    });
    child.stderr.on('data', (d) => {
      stderr += String(d);
    });
    child.on('error', () => {
      clearTimeout(timer);
      resolve(null);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        resolve(null);
        return;
      }
      try {
        const parsed = JSON.parse(stdout) as SolverResult;
        resolve(parsed);
      } catch {
        resolve(null);
      }
    });
    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
    void stderr;
  });
}
