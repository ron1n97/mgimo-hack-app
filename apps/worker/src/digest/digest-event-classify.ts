import { EventModerationStatus, type PrismaClient } from '@prisma/client';
import type { EmbedOpts } from './digest-embed';
import { predictViaPython } from './digest-ml-client';
import {
  loadDigestMlModel,
  predictTfidf,
  type DigestMlPrediction,
} from './digest-ml-infer';

/**
 * Digest moderation: ML (LogReg on embeddings/TF-IDF) → LLM verify on uncertain.
 * Staff UI remains optional override.
 */

export type DigestClassifyInput = {
  title: string;
  body?: string | null;
};

export type DigestClassifyResult = {
  status: EventModerationStatus;
  source: 'ml' | 'zcode' | 'heuristic';
  reason: string;
  pEvent?: number;
};

export type DigestClassifyLlmOpts = EmbedOpts & {
  classifyImpl?: (
    input: DigestClassifyInput,
  ) => Promise<DigestClassifyResult> | DigestClassifyResult;
  /** Force skip ML (tests). */
  skipMl?: boolean;
  modelPath?: string;
};

const GENERIC_TITLE =
  /^(дорогие друзья!?|друзья!?|анонс|новости|добрый день.*|привет.*|chers amis,?|olá,? pessoal!?|мероприятие)\s*$/i;

/**
 * If TG preview title is a greeting, lift a sharper line from the body.
 */
export function improveDigestTitle(title: string, body?: string | null): string {
  const t = title.trim();
  if (!GENERIC_TITLE.test(t) && t.length >= 12 && !/^дорогие друзья/i.test(t)) {
    return t;
  }
  const raw = (body ?? '').replace(/\s+/g, ' ').trim();
  if (!raw) return t;
  const quoted = raw.match(/[«"]([^«»"]{12,90})[»"]/);
  if (quoted?.[1]) return quoted[1].trim();
  const withWhen = raw.match(
    /([^.]{0,40}\d{1,2}\s+(?:января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря|ноябр\w*)[^.]{0,50})/i,
  );
  if (withWhen?.[1]) return withWhen[1].trim().slice(0, 120);
  const first = raw.split(/(?<=[.!?])\s+/)[0]?.trim() ?? raw;
  return first.slice(0, 120) || t;
}

function textOf(input: DigestClassifyInput): string {
  return `${input.title}\n${input.body ?? ''}`.trim();
}

function fromMl(pred: DigestMlPrediction): DigestClassifyResult | null {
  if (pred.uncertain) return null;
  return {
    status:
      pred.label === 'event'
        ? EventModerationStatus.APPROVED
        : EventModerationStatus.REJECTED,
    source: 'ml',
    reason: `ml_p=${pred.pEvent.toFixed(3)}`,
    pEvent: pred.pEvent,
  };
}

async function runMl(
  input: DigestClassifyInput,
  opts: DigestClassifyLlmOpts,
): Promise<{ pred: DigestMlPrediction; mode: string } | null> {
  const text = textOf(input);

  // 1) sentence-transformers + LogReg via Python (preferred)
  try {
    const [pred] = await predictViaPython([text], {
      timeoutMs: 90_000,
    });
    if (pred) return { pred, mode: 'st_logreg' };
  } catch {
    /* fall through to JSON model */
  }

  // 2) Pure-TS TF-IDF LogReg artifact
  try {
    const model = loadDigestMlModel(opts.modelPath);
    if (model.type === 'logreg_tfidf') {
      return { pred: predictTfidf(text, model), mode: 'tfidf' };
    }
    // joblib meta without Python — cannot embed here
    return null;
  } catch {
    return null;
  }
}

function parseLlmVerdict(raw: string): EventModerationStatus | null {
  const normalized = raw.trim().toLowerCase();
  try {
    const start = normalized.indexOf('{');
    const end = normalized.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const obj = JSON.parse(normalized.slice(start, end + 1)) as {
        verdict?: string;
      };
      const v = (obj.verdict ?? '').toLowerCase();
      if (v === 'event' || v === 'approve' || v === 'approved') {
        return EventModerationStatus.APPROVED;
      }
      if (v === 'junk' || v === 'reject' || v === 'rejected') {
        return EventModerationStatus.REJECTED;
      }
      if (v === 'unsure' || v === 'pending') {
        return EventModerationStatus.PENDING;
      }
    }
  } catch {
    /* fall through */
  }
  if (/\b(event|approve|approved|событие)\b/.test(normalized)) {
    return EventModerationStatus.APPROVED;
  }
  if (/\b(junk|reject|rejected|отклон|мусор)\b/.test(normalized)) {
    return EventModerationStatus.REJECTED;
  }
  if (/\b(unsure|pending|неуверен)\b/.test(normalized)) {
    return EventModerationStatus.PENDING;
  }
  return null;
}

const SYSTEM = `Ты верификатор студенческого дайджеста МГИМО.
ML уже дал сомнительный score. Подтверди: event (анонс встречи/лекции/игры/дебатов/клуба/хакатона/дедлайн регистрации) или junk (мем, ДР, pinned, крипта, постфактум без анонса, учебная карточка).
Ответь ТОЛЬКО JSON: {"verdict":"event"|"junk"|"unsure","reason":"кратко"}`;

async function llmVerify(
  input: DigestClassifyInput,
  opts: DigestClassifyLlmOpts,
  mlHint?: DigestMlPrediction,
): Promise<DigestClassifyResult> {
  const apiKey = opts.apiKey?.trim() || process.env.ZCODE_API_KEY?.trim();
  if (!apiKey) {
    return {
      status: EventModerationStatus.PENDING,
      source: 'heuristic',
      reason: 'no_api_key',
      pEvent: mlHint?.pEvent,
    };
  }
  let baseUrl = (
    opts.baseUrl ||
    process.env.ZCODE_BASE_URL ||
    'https://api.z.ai/api/coding/paas/v4'
  ).replace(/\/$/, '');
  const model = opts.model || process.env.ZCODE_MODEL || 'glm-5.3';
  const doFetch = opts.fetchImpl ?? fetch;
  const hint =
    mlHint != null
      ? `ML p(event)=${mlHint.pEvent.toFixed(3)} (uncertain band).`
      : 'ML unavailable.';

  try {
    const res = await doFetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          { role: 'system', content: SYSTEM },
          {
            role: 'user',
            content: `${hint}\nЗаголовок: ${input.title}\nТекст: ${(input.body ?? '').slice(0, 1200)}`,
          },
        ],
      }),
    });
    if (!res.ok) {
      return {
        status: EventModerationStatus.PENDING,
        source: 'heuristic',
        reason: `llm_http_${res.status}`,
        pEvent: mlHint?.pEvent,
      };
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const verdict = parseLlmVerdict(data.choices?.[0]?.message?.content ?? '');
    if (!verdict) {
      return {
        status: EventModerationStatus.PENDING,
        source: 'heuristic',
        reason: 'llm_parse_fail',
        pEvent: mlHint?.pEvent,
      };
    }
    return {
      status: verdict,
      source: 'zcode',
      reason: 'llm_verify',
      pEvent: mlHint?.pEvent,
    };
  } catch {
    return {
      status: EventModerationStatus.PENDING,
      source: 'heuristic',
      reason: 'llm_error',
      pEvent: mlHint?.pEvent,
    };
  }
}

/**
 * Legacy name kept for tests — thin heuristic only used if ML+LLM fail.
 * Prefer ML path via classifyDigestPost.
 */
export function classifyDigestHeuristic(
  input: DigestClassifyInput,
): DigestClassifyResult {
  const text = textOf(input);
  const eventish =
    /(регистрац|семинар|лекци|хакатон|open\s*talk|дебат|кинопоказ|в\s+\d{1,2}[:.]\d{2}|зал\s+\d)/i.test(
      text,
    );
  const junkish =
    /(день рождения|поздравляем|bitcoin|майнер|сленг|pinned|прошла на ура)/i.test(
      text,
    );
  if (eventish && !junkish) {
    return {
      status: EventModerationStatus.APPROVED,
      source: 'heuristic',
      reason: 'fallback_event',
    };
  }
  if (junkish && !eventish) {
    return {
      status: EventModerationStatus.REJECTED,
      source: 'heuristic',
      reason: 'fallback_junk',
    };
  }
  return {
    status: EventModerationStatus.PENDING,
    source: 'heuristic',
    reason: 'fallback_unsure',
  };
}

/**
 * ML → (uncertain|fail) → LLM verify → heuristic last resort.
 */
export async function classifyDigestPost(
  input: DigestClassifyInput,
  opts: DigestClassifyLlmOpts = {},
): Promise<DigestClassifyResult> {
  if (opts.classifyImpl) {
    return opts.classifyImpl(input);
  }

  if (!opts.skipMl) {
    const ml = await runMl(input, opts);
    if (ml) {
      const decided = fromMl(ml.pred);
      if (decided) {
        return { ...decided, reason: `${decided.reason}:${ml.mode}` };
      }
      // uncertain band → LLM
      return llmVerify(input, opts, ml.pred);
    }
  }

  // No model / embed failed → LLM, then heuristic
  const verified = await llmVerify(input, opts);
  if (verified.status !== EventModerationStatus.PENDING) {
    return verified;
  }
  return classifyDigestHeuristic(input);
}

export function statusForNewDigestPost(
  classified: DigestClassifyResult,
): EventModerationStatus {
  return classified.status;
}

export type ReclassifyPendingResult = {
  scanned: number;
  approved: number;
  rejected: number;
  leftPending: number;
  titlesFixed: number;
};

/** Revisit PENDING + AI-only REJECTED/APPROVED (no staff moderator). */
export async function reclassifyPendingDigest(
  prisma: Pick<PrismaClient, 'eventCandidate'>,
  opts: DigestClassifyLlmOpts & {
    limit?: number;
    now?: Date;
    includeAiRejected?: boolean;
    scrubApproved?: boolean;
  } = {},
): Promise<ReclassifyPendingResult> {
  const now = opts.now ?? new Date();
  const includeAiRejected = opts.includeAiRejected ?? true;
  const scrubApproved = opts.scrubApproved ?? true;

  const statusFilter: EventModerationStatus[] = [
    EventModerationStatus.PENDING,
  ];
  if (includeAiRejected) statusFilter.push(EventModerationStatus.REJECTED);
  if (scrubApproved) statusFilter.push(EventModerationStatus.APPROVED);

  const rows = await prisma.eventCandidate.findMany({
    where: {
      moderationStatus: { in: statusFilter },
      moderatedByUserId: null,
    },
    select: { id: true, title: true, body: true, moderationStatus: true },
    take: opts.limit ?? 800,
    orderBy: { publishedAt: 'desc' },
  });

  const result: ReclassifyPendingResult = {
    scanned: rows.length,
    approved: 0,
    rejected: 0,
    leftPending: 0,
    titlesFixed: 0,
  };

  for (const row of rows) {
    const classified = await classifyDigestPost(
      { title: row.title, body: row.body },
      opts,
    );
    const betterTitle = improveDigestTitle(row.title, row.body);
    const titleChanged = betterTitle !== row.title;

    if (
      classified.status === EventModerationStatus.PENDING &&
      row.moderationStatus === EventModerationStatus.PENDING &&
      !titleChanged
    ) {
      result.leftPending += 1;
      continue;
    }

    let next = classified.status;
    if (
      row.moderationStatus === EventModerationStatus.APPROVED &&
      next === EventModerationStatus.PENDING
    ) {
      if (!titleChanged) {
        result.leftPending += 1;
        continue;
      }
      next = EventModerationStatus.APPROVED;
    }

    await prisma.eventCandidate.update({
      where: { id: row.id },
      data: {
        moderationStatus: next,
        moderatedAt: now,
        ...(titleChanged ? { title: betterTitle } : {}),
      },
    });
    if (titleChanged) result.titlesFixed += 1;
    if (next === EventModerationStatus.APPROVED) result.approved += 1;
    else if (next === EventModerationStatus.REJECTED) result.rejected += 1;
    else result.leftPending += 1;
  }
  return result;
}
