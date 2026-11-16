/**
 * Worker job: ingestDigest — pull ClubSource VK walls when VK_SERVICE_TOKEN
 * is set; skip Telegram channel scrape (bot product cancelled). ADR 0016.
 */
import { EventModerationStatus } from '@prisma/client';
import { getPrisma, disconnectPrisma } from '../db';
import { fetchVkWall, mapVkPostToCandidate, parseVkDomain } from './vk';

export type IngestDigestOptions = {
  vkServiceToken?: string | null;
  /** Cap sources per run (smoke / tests). */
  maxSources?: number;
  fetchImpl?: typeof fetch;
  /** Inject prisma for unit tests. */
  prisma?: DigestPrisma;
  logger?: Pick<Console, 'log' | 'warn' | 'info'>;
};

export type DigestPrisma = {
  clubSource: {
    findMany: (args: unknown) => Promise<
      Array<{
        id: string;
        clubId: string | null;
        kind: string;
        url: string;
        enabled: boolean;
      }>
    >;
  };
  eventCandidate: {
    findFirst: (args: unknown) => Promise<{ id: string } | null>;
    create: (args: unknown) => Promise<unknown>;
  };
};

export type IngestDigestResult = {
  skipped: boolean;
  skipReason?: string;
  vkSources: number;
  telegramSkipped: number;
  websiteSkipped: number;
  created: number;
  updated: number;
  errors: string[];
};

export async function ingestDigest(
  options: IngestDigestOptions = {},
): Promise<IngestDigestResult> {
  const log = options.logger ?? console;
  const token =
    options.vkServiceToken ?? process.env.VK_SERVICE_TOKEN ?? null;

  const ownsPrisma = !options.prisma;
  const prisma = options.prisma ?? (getPrisma() as unknown as DigestPrisma);

  const result: IngestDigestResult = {
    skipped: false,
    vkSources: 0,
    telegramSkipped: 0,
    websiteSkipped: 0,
    created: 0,
    updated: 0,
    errors: [],
  };

  try {
    if (!token?.trim()) {
      result.skipped = true;
      result.skipReason = 'VK_SERVICE_TOKEN absent — digest ingest no-op';
      log.log(`[ingestDigest] ${result.skipReason}`);
    }

    const sources = await prisma.clubSource.findMany({
      where: { enabled: true },
      orderBy: { createdAt: 'asc' },
      take: options.maxSources,
    } as never);

    const vkSources = sources.filter((s) => s.kind === 'VK');
    const tgSources = sources.filter((s) => s.kind === 'TELEGRAM');
    const webSources = sources.filter((s) => s.kind === 'WEBSITE');

    result.telegramSkipped = tgSources.length;
    result.websiteSkipped = webSources.length;
    if (tgSources.length) {
      log.log(
        `[ingestDigest] skip ${tgSources.length} TELEGRAM source(s) — no channel scrape without bot`,
      );
    }
    if (webSources.length) {
      log.log(
        `[ingestDigest] skip ${webSources.length} WEBSITE source(s) — RSS ingest not in this slice`,
      );
    }

    if (!token?.trim()) {
      return result;
    }

    result.vkSources = vkSources.length;
    for (const source of vkSources) {
      const domain = parseVkDomain(source.url);
      if (!domain) {
        result.errors.push(`bad VK url: ${source.url}`);
        continue;
      }
      try {
        const { posts, error } = await fetchVkWall({
          domain,
          accessToken: token.trim(),
          count: 8,
          fetchImpl: options.fetchImpl,
        });
        if (error) {
          result.errors.push(`${domain}: ${error}`);
          continue;
        }
        for (const post of posts) {
          const mapped = mapVkPostToCandidate(post);
          const existing = await prisma.eventCandidate.findFirst({
            where: { url: mapped.url },
          } as never);
          if (existing) {
            result.updated += 1;
            continue;
          }
          await prisma.eventCandidate.create({
            data: {
              clubId: source.clubId,
              sourceId: source.id,
              title: mapped.title,
              body: mapped.body,
              url: mapped.url,
              startsAt: mapped.startsAt,
              moderationStatus: EventModerationStatus.PENDING,
            },
          } as never);
          result.created += 1;
        }
      } catch (err) {
        result.errors.push(`${domain}: ${String(err)}`);
      }
    }

    log.log(
      `[ingestDigest] done vk=${result.vkSources} created=${result.created} dupes=${result.updated} errors=${result.errors.length}`,
    );
    return result;
  } finally {
    if (ownsPrisma) {
      await disconnectPrisma();
    }
  }
}
