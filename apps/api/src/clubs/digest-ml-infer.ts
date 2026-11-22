import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export type DigestMlLabel = 'event' | 'junk';

export type DigestMlModel = {
  type: 'logreg_embedding' | 'logreg_tfidf';
  version: number;
  classes: DigestMlLabel[];
  coef: number[][];
  intercept: number[];
  thresholds: { low: number; high: number };
  embed?: {
    model: string;
    dimensions: number;
    normalize?: boolean;
  };
  tfidf?: {
    analyzer: string;
    ngram_range: [number, number];
    vocabulary: Record<string, number>;
    idf: number[];
  };
  metrics?: Record<string, unknown>;
};

export type DigestMlPrediction = {
  label: DigestMlLabel;
  pEvent: number;
  pJunk: number;
  /** true when score is in the mid band → ask LLM */
  uncertain: boolean;
  source: 'ml';
};

let cached: DigestMlModel | null = null;

export function loadDigestMlModel(path?: string): DigestMlModel {
  if (cached && !path) return cached;
  const candidates = [
    path,
    process.env.DIGEST_ML_MODEL_PATH,
    // Prefer pure-TS TF-IDF artifact inside Docker/alpine.
    join(process.cwd(), 'apps/digest-ml/artifacts/model-tfidf.json'),
    join(process.cwd(), 'digest-ml/artifacts/model-tfidf.json'),
    join(__dirname, '../../../../digest-ml/artifacts/model-tfidf.json'),
    join(process.cwd(), 'apps/digest-ml/artifacts/model.json'),
    join(process.cwd(), '../../digest-ml/artifacts/model.json'),
    join(__dirname, '../../../../digest-ml/artifacts/model.json'),
  ].filter(Boolean) as string[];

  let lastErr: unknown;
  for (const p of candidates) {
    try {
      const raw = readFileSync(p, 'utf8');
      cached = JSON.parse(raw) as DigestMlModel;
      return cached;
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(
    `digest ML model not found (set DIGEST_ML_MODEL_PATH): ${String(lastErr)}`,
  );
}

/** Reset cache — tests only. */
export function resetDigestMlModelCache(): void {
  cached = null;
}

function sigmoid(z: number): number {
  if (z >= 0) {
    const ez = Math.exp(-z);
    return 1 / (1 + ez);
  }
  const ez = Math.exp(z);
  return ez / (1 + ez);
}

function dot(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let s = 0;
  for (let i = 0; i < n; i += 1) s += a[i] * b[i];
  return s;
}

function l2normalize(v: number[]): number[] {
  let n = 0;
  for (const x of v) n += x * x;
  n = Math.sqrt(n) || 1;
  return v.map((x) => x / n);
}

/** char_wb n-grams matching sklearn analyzer='char_wb'. */
export function charWbNgrams(
  text: string,
  nMin: number,
  nMax: number,
): string[] {
  const padded = ` ${text.replace(/\s+/g, ' ').trim()} `;
  const out: string[] = [];
  for (let n = nMin; n <= nMax; n += 1) {
    for (let i = 0; i + n <= padded.length; i += 1) {
      out.push(padded.slice(i, i + n));
    }
  }
  return out;
}

export function vectorizeTfidf(
  text: string,
  model: DigestMlModel,
): number[] {
  const tfidf = model.tfidf;
  if (!tfidf) throw new Error('model has no tfidf block');
  const [nMin, nMax] = tfidf.ngram_range;
  const grams = charWbNgrams(text.toLowerCase(), nMin, nMax);
  const counts = new Map<number, number>();
  for (const g of grams) {
    const idx = tfidf.vocabulary[g];
    if (idx === undefined) continue;
    counts.set(idx, (counts.get(idx) ?? 0) + 1);
  }
  const dim = tfidf.idf.length;
  const vec = new Array<number>(dim).fill(0);
  let sumSq = 0;
  for (const [idx, c] of counts) {
    const val = c * tfidf.idf[idx];
    vec[idx] = val;
    sumSq += val * val;
  }
  const norm = Math.sqrt(sumSq) || 1;
  for (let i = 0; i < dim; i += 1) vec[i] /= norm;
  return vec;
}

/**
 * Binary LogReg: classes [junk, event], coef shape [1, dim].
 * Returns P(event).
 */
export function predictPEvent(features: number[], model: DigestMlModel): number {
  const coef = model.coef[0];
  const intercept = model.intercept[0] ?? 0;
  const z = dot(coef, features) + intercept;
  return sigmoid(z);
}

export function predictFromFeatures(
  features: number[],
  model: DigestMlModel,
): DigestMlPrediction {
  const pEvent = predictPEvent(features, model);
  const pJunk = 1 - pEvent;
  const low = model.thresholds?.low ?? 0.35;
  const high = model.thresholds?.high ?? 0.65;
  const uncertain = pEvent > low && pEvent < high;
  const label: DigestMlLabel = pEvent >= 0.5 ? 'event' : 'junk';
  return { label, pEvent, pJunk, uncertain, source: 'ml' };
}

export function predictTfidf(
  text: string,
  model: DigestMlModel = loadDigestMlModel(),
): DigestMlPrediction {
  if (model.type !== 'logreg_tfidf') {
    throw new Error(`predictTfidf requires logreg_tfidf, got ${model.type}`);
  }
  return predictFromFeatures(vectorizeTfidf(text, model), model);
}

export function predictEmbedding(
  embedding: number[],
  model: DigestMlModel = loadDigestMlModel(),
): DigestMlPrediction {
  if (model.type !== 'logreg_embedding') {
    throw new Error(
      `predictEmbedding requires logreg_embedding, got ${model.type}`,
    );
  }
  const feat = model.embed?.normalize === false ? embedding : l2normalize(embedding);
  return predictFromFeatures(feat, model);
}
