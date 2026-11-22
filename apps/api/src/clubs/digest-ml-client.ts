import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestMlPrediction } from './digest-ml-infer';

export type DigestMlClientOpts = {
  scriptPath?: string;
  pythonPath?: string;
  joblibPath?: string;
  timeoutMs?: number;
};

function defaultPredictScript(): string {
  return (
    process.env.DIGEST_ML_PREDICT_SCRIPT?.trim() ||
    join(process.cwd(), 'apps/digest-ml/scripts/predict.py')
  );
}

/**
 * Call local sentence-transformers + LogReg via Python (same pattern as CPSAT).
 */
export function predictViaPython(
  texts: string[],
  opts: DigestMlClientOpts = {},
): Promise<DigestMlPrediction[]> {
  const script = opts.scriptPath ?? defaultPredictScript();
  const venvPy = join(process.cwd(), 'apps/digest-ml/.venv/bin/python');
  const python =
    opts.pythonPath ??
    process.env.DIGEST_ML_PYTHON ??
    (existsSync(venvPy) ? venvPy : 'python3');
  const timeoutMs = opts.timeoutMs ?? 120_000;

  return new Promise((resolve, reject) => {
    const child = spawn(python, [script], {
      env: {
        ...process.env,
        ...(opts.joblibPath
          ? { DIGEST_ML_JOBLIB: opts.joblibPath }
          : {}),
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('digest_ml_timeout'));
    }, timeoutMs);

    child.stdout.on('data', (c: Buffer) => {
      stdout += c.toString('utf8');
    });
    child.stderr.on('data', (c: Buffer) => {
      stderr += c.toString('utf8');
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(
          new Error(
            `digest_ml_exit_${code}:${stderr.slice(0, 240) || stdout.slice(0, 240)}`,
          ),
        );
        return;
      }
      try {
        const parsed = JSON.parse(stdout) as {
          error?: string;
          predictions?: Array<{
            label: 'event' | 'junk';
            p_event: number;
            uncertain: boolean;
          }>;
        };
        if (parsed.error) {
          reject(new Error(parsed.error));
          return;
        }
        const preds = (parsed.predictions ?? []).map((p) => ({
          label: p.label,
          pEvent: p.p_event,
          pJunk: 1 - p.p_event,
          uncertain: p.uncertain,
          source: 'ml' as const,
        }));
        if (preds.length !== texts.length) {
          reject(new Error('digest_ml_count_mismatch'));
          return;
        }
        resolve(preds);
      } catch (err) {
        reject(err);
      }
    });
    child.stdin.write(JSON.stringify({ texts }));
    child.stdin.end();
  });
}
