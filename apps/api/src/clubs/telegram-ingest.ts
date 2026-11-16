import {
  ClubSourceKind,
  EventModerationStatus,
  PrismaClient,
} from '@prisma/client';
import {
  parseTelegramPreviewHtml,
  telegramPreviewUrl,
  type TelegramPreviewPost,
} from './telegram-preview';

export type TelegramIngestOptions = {
  /** Max posts kept per source (newest first). */
  perSourceLimit?: number;
  /** Skip posts older than this many days. */
  maxAgeDays?: number;
  /**
   * Cap TELEGRAM sources per run. Default covers full registry (~70).
   * Pass a smaller number only for tests.
   */
  maxSources?: number;
  fetchHtml?: (url: string) => Promise<string>;
  now?: Date;
  /** When true, demote seeded demo stubs after a successful ingest. */
  retireDemoStubs?: boolean;
};

export type TelegramIngestResult = {
  sourcesTried: number;
  sourcesOk: number;
  postsUpserted: number;
  postsSkippedRejected: number;
  /** Existing post URL already owned by another club/source — do not reassign. */
  postsSkippedForeign: number;
  stubsRetired: number;
  errors: Array<{ sourceId: string; url: string; error: string }>;
};

type PrismaLike = Pick<PrismaClient, 'clubSource' | 'eventCandidate'>;

const DEFAULT_UA =
  'Mozilla/5.0 (compatible; DekanatDigestBot/0.1; +https://github.com/ron1n97/mgimo-hack-app)';

/** Seed/demo titles only — never match arbitrary live channel first lines. */
const DEMO_STUB_TITLE_PREFIXES = ['Демо:', 'Демо-событие:', 'Новость:'] as const;

export async function defaultFetchTelegramHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': DEFAULT_UA,
      Accept: 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return res.text();
}

function isFresh(post: TelegramPreviewPost, now: Date, maxAgeDays: number): boolean {
  const ageMs = now.getTime() - post.publishedAt.getTime();
  return ageMs <= maxAgeDays * 24 * 3600 * 1000 && ageMs >= -24 * 3600 * 1000;
}

/** Whether this ClubSource may refresh an existing EventCandidate row. */
export function sourceOwnsEvent(
  source: { id: string; clubId: string | null },
  row: { clubId: string | null; sourceId: string | null },
): boolean {
  if (row.sourceId === source.id) return true;
  if (row.clubId && source.clubId && row.clubId === source.clubId) return true;
  // Orphan row (no club/source) — first successful ingest may claim it.
  if (!row.clubId && !row.sourceId) return true;
  return false;
}

/**
 * Pull public t.me/s previews for enabled TELEGRAM ClubSources and upsert
 * APPROVED EventCandidates (staff already enabled digest on the club/source).
 */
export async function syncTelegramDigest(
  prisma: PrismaLike,
  opts: TelegramIngestOptions = {},
): Promise<TelegramIngestResult> {
  const perSourceLimit = opts.perSourceLimit ?? 8;
  const maxAgeDays = opts.maxAgeDays ?? 21;
  const maxSources = opts.maxSources ?? 120;
  const fetchHtml = opts.fetchHtml ?? defaultFetchTelegramHtml;
  const now = opts.now ?? new Date();
  const retireDemoStubs = opts.retireDemoStubs ?? true;

  const sources = await prisma.clubSource.findMany({
    where: {
      kind: ClubSourceKind.TELEGRAM,
      enabled: true,
      OR: [{ clubId: null }, { club: { digestEnabled: true } }],
    },
    include: { club: { select: { id: true, digestEnabled: true } } },
    take: maxSources,
    orderBy: { createdAt: 'asc' },
  });

  const result: TelegramIngestResult = {
    sourcesTried: 0,
    sourcesOk: 0,
    postsUpserted: 0,
    postsSkippedRejected: 0,
    postsSkippedForeign: 0,
    stubsRetired: 0,
    errors: [],
  };

  for (const source of sources) {
    const preview = telegramPreviewUrl(source.url);
    if (!preview) continue;
    result.sourcesTried += 1;
    try {
      const html = await fetchHtml(preview);
      const posts = parseTelegramPreviewHtml(html)
        .filter((p) => isFresh(p, now, maxAgeDays))
        .slice(0, perSourceLimit);

      for (const post of posts) {
        const existing = await prisma.eventCandidate.findFirst({
          where: { url: post.url },
          select: {
            id: true,
            moderationStatus: true,
            clubId: true,
            sourceId: true,
          },
        });
        if (existing?.moderationStatus === EventModerationStatus.REJECTED) {
          result.postsSkippedRejected += 1;
          continue;
        }
        if (
          existing &&
          !sourceOwnsEvent(
            { id: source.id, clubId: source.clubId },
            existing,
          )
        ) {
          result.postsSkippedForeign += 1;
          continue;
        }

        const data = {
          clubId: source.clubId,
          sourceId: source.id,
          title: post.title,
          body: post.body || post.text.slice(0, 2000),
          url: post.url,
          startsAt: post.publishedAt,
          moderationStatus: EventModerationStatus.APPROVED,
          publishedAt: post.publishedAt,
          moderatedAt: now,
        };
        if (existing) {
          await prisma.eventCandidate.update({
            where: { id: existing.id },
            data,
          });
        } else {
          try {
            await prisma.eventCandidate.create({ data });
          } catch (err) {
            const code =
              err && typeof err === 'object' && 'code' in err
                ? String((err as { code?: string }).code)
                : '';
            if (code !== 'P2002') throw err;
            const raced = await prisma.eventCandidate.findFirst({
              where: { url: post.url },
              select: {
                id: true,
                moderationStatus: true,
                clubId: true,
                sourceId: true,
              },
            });
            if (!raced || raced.moderationStatus === EventModerationStatus.REJECTED) {
              if (raced) result.postsSkippedRejected += 1;
              continue;
            }
            if (
              !sourceOwnsEvent(
                { id: source.id, clubId: source.clubId },
                raced,
              )
            ) {
              result.postsSkippedForeign += 1;
              continue;
            }
            await prisma.eventCandidate.update({
              where: { id: raced.id },
              data,
            });
          }
        }
        result.postsUpserted += 1;
      }
      result.sourcesOk += 1;
    } catch (err) {
      result.errors.push({
        sourceId: source.id,
        url: source.url,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (retireDemoStubs && result.postsUpserted > 0) {
    const retired = await prisma.eventCandidate.updateMany({
      where: {
        moderationStatus: EventModerationStatus.APPROVED,
        OR: DEMO_STUB_TITLE_PREFIXES.map((prefix) => ({
          title: { startsWith: prefix },
        })),
      },
      data: { moderationStatus: EventModerationStatus.REJECTED },
    });
    result.stubsRetired = retired.count;
  }

  return result;
}
