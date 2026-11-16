/**
 * Seed clubs registry from prisma/data/clubs-registry.json (exported from xlsx).
 * Idempotent upsert by name; attaches category tags + TG/VK/website sources.
 */
import {
  ClubMembershipRole,
  ClubStatus,
  EventModerationStatus,
  PrismaClient,
} from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { detectSourceKind, slugifyTag } from '../src/clubs/club-slug';
import { materializeDigestNewsFeed } from '../src/clubs/digest-news-feed';

type RegistryRow = {
  name: string;
  category?: string | null;
  structure?: string | null;
  vk?: string | null;
  telegram?: string | null;
  website?: string | null;
  note?: string | null;
};

export async function seedClubsRegistry(
  prisma: PrismaClient,
  opts?: { confirmAsUserId?: string; limit?: number },
) {
  const file = path.join(__dirname, 'data', 'clubs-registry.json');
  const rows = JSON.parse(fs.readFileSync(file, 'utf8')) as RegistryRow[];
  const slice = opts?.limit ? rows.slice(0, opts.limit) : rows;
  const staffId = opts?.confirmAsUserId;

  let created = 0;
  for (const row of slice) {
    const name = row.name?.trim();
    if (!name) continue;

    const existing = await prisma.club.findFirst({ where: { name } });
    let clubId = existing?.id;

    if (!clubId) {
      const club = await prisma.club.create({
        data: {
          name,
          description: row.note ?? undefined,
          structureNote: row.structure ?? undefined,
          websiteUrl: row.website ?? undefined,
          status: ClubStatus.CONFIRMED,
          digestEnabled: Boolean(row.telegram || row.vk),
          confirmedAt: new Date(),
          confirmedByUserId: staffId,
          createdByUserId: staffId,
        },
      });
      clubId = club.id;
      created += 1;
    } else {
      await prisma.club.update({
        where: { id: clubId },
        data: {
          description: row.note ?? undefined,
          structureNote: row.structure ?? undefined,
          websiteUrl: row.website ?? undefined,
          status: ClubStatus.CONFIRMED,
          digestEnabled: Boolean(row.telegram || row.vk),
          confirmedAt: existing?.confirmedAt ?? new Date(),
          confirmedByUserId: existing?.confirmedByUserId ?? staffId,
        },
      });
    }

    if (row.category) {
      const slug = slugifyTag(row.category);
      const tag = await prisma.tag.upsert({
        where: { slug },
        create: { slug, name: row.category },
        update: { name: row.category },
      });
      await prisma.clubTag.upsert({
        where: { clubId_tagId: { clubId, tagId: tag.id } },
        create: { clubId, tagId: tag.id },
        update: {},
      });
    }

    for (const url of [row.telegram, row.vk, row.website]) {
      if (!url?.trim()) continue;
      await prisma.clubSource.upsert({
        where: { url: url.trim() },
        create: {
          clubId,
          url: url.trim(),
          kind: detectSourceKind(url),
          enabled: true,
          createdByUserId: staffId,
        },
        update: { clubId, enabled: true },
      });
    }
  }

  return { total: slice.length, created };
}

export async function seedDemoClubEvents(
  prisma: PrismaClient,
  opts: { studentUserId: string; staffUserId: string },
) {
  const sportTag = await prisma.tag.findFirst({
    where: { slug: 'sport' },
  });
  const club =
    (await prisma.club.findFirst({
      where: {
        digestEnabled: true,
        status: ClubStatus.CONFIRMED,
        ...(sportTag
          ? { tags: { some: { tagId: sportTag.id } } }
          : {}),
      },
      include: { sources: true },
    })) ??
    (await prisma.club.findFirst({
      where: { status: ClubStatus.CONFIRMED },
      include: { sources: true },
    }));

  if (!club) return;

  await prisma.clubSubscription.upsert({
    where: {
      userId_clubId: { userId: opts.studentUserId, clubId: club.id },
    },
    create: { userId: opts.studentUserId, clubId: club.id },
    update: {},
  });

  if (sportTag) {
    await prisma.studentTagSubscription.upsert({
      where: {
        userId_tagId: { userId: opts.studentUserId, tagId: sportTag.id },
      },
      create: { userId: opts.studentUserId, tagId: sportTag.id },
      update: {},
    });
  }

  const sourceId = club.sources[0]?.id;
  const now = Date.now();
  // Moscow calendar noon as UTC instant (09:00Z ≈ 12:00 MSK in winter).
  // Re-run seed:extras must refresh startsAt — otherwise "сегодня" freezes on first seed day.
  const mskDay = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const [y, m, d] = mskDay.split('-').map(Number);
  const moscowNoon = new Date(Date.UTC(y, m - 1, d, 9, 0, 0));
  const stubs = [
    {
      title: 'Демо: что сегодня в клубе',
      body: 'Ежедневный дайджест — stub для экрана «Сегодня» (без live-ingest).',
      startsAt: moscowNoon,
      moderationStatus: EventModerationStatus.APPROVED,
      refreshStartsAt: true,
    },
    {
      title: 'Демо: открытая тренировка ССК',
      body: 'Кандидат из дайджеста — ждёт модерации коллеги перед афишей.',
      startsAt: new Date(now + 3 * 24 * 3600 * 1000),
      moderationStatus: EventModerationStatus.PENDING,
      refreshStartsAt: true,
    },
    {
      title: 'Демо: товарищеский матч',
      body: 'Недельный дайджест — одобрено, видно в ленте и на «Сегодня».',
      startsAt: new Date(now + 4 * 24 * 3600 * 1000),
      moderationStatus: EventModerationStatus.APPROVED,
      refreshStartsAt: true,
    },
    {
      title: 'Демо: недельный обзор клубов',
      body: 'Сводка на неделю: встречи, дедлайны заявок в клубы, анонсы.',
      startsAt: new Date(now + 5 * 24 * 3600 * 1000),
      moderationStatus: EventModerationStatus.APPROVED,
      refreshStartsAt: true,
    },
  ] as const;

  for (const stub of stubs) {
    const existing = await prisma.eventCandidate.findFirst({
      where: { title: stub.title },
    });
    const baseUrl = club.sources[0]?.url?.replace(/#.*$/, '') ?? null;
    const stubUrl = baseUrl
      ? `${baseUrl}#demo/${encodeURIComponent(stub.title)}`
      : null;
    if (existing) {
      if (stub.refreshStartsAt) {
        await prisma.eventCandidate.update({
          where: { id: existing.id },
          data: {
            startsAt: stub.startsAt,
            body: stub.body,
            url: stubUrl ?? undefined,
            moderationStatus: stub.moderationStatus,
            ...(stub.moderationStatus === EventModerationStatus.APPROVED
              ? {
                  moderatedAt: existing.moderatedAt ?? new Date(),
                  moderatedByUserId: existing.moderatedByUserId ?? opts.staffUserId,
                  publishedAt: existing.publishedAt ?? new Date(),
                }
              : {}),
          },
        });
      }
      continue;
    }
    await prisma.eventCandidate.create({
      data: {
        clubId: club.id,
        sourceId,
        title: stub.title,
        body: stub.body,
        url: stubUrl,
        startsAt: stub.startsAt,
        moderationStatus: stub.moderationStatus,
        ...(stub.moderationStatus === EventModerationStatus.APPROVED
          ? {
              moderatedAt: new Date(),
              moderatedByUserId: opts.staffUserId,
              publishedAt: new Date(),
            }
          : {}),
      },
    });
  }

  await seedDigestNewsFeed(prisma, { staffUserId: opts.staffUserId });

  // Ensure membership role type is referenced for prisma client tree-shake safety
  void ClubMembershipRole.OWNER;
}

/**
 * Durable MSK-week news-like digest rows with links to club VK/TG sources.
 * Idempotent upsert by title; refreshes startsAt on every seed / seed:extras.
 */
export async function seedDigestNewsFeed(
  prisma: PrismaClient,
  opts: { staffUserId: string; now?: Date },
) {
  const clubs = await prisma.club.findMany({
    where: { status: ClubStatus.CONFIRMED },
    include: { sources: true },
    orderBy: { name: 'asc' },
  });
  if (!clubs.length) return { upserted: 0 };

  const rows = materializeDigestNewsFeed(
    clubs.map((c) => ({
      id: c.id,
      name: c.name,
      sources: c.sources.map((s) => ({
        id: s.id,
        kind: s.kind,
        url: s.url,
        enabled: s.enabled,
      })),
    })),
    opts.now ?? new Date(),
  );

  let upserted = 0;
  for (const row of rows) {
    const existing = await prisma.eventCandidate.findFirst({
      where: { title: row.title },
    });
    if (existing) {
      await prisma.eventCandidate.update({
        where: { id: existing.id },
        data: {
          body: row.body,
          startsAt: row.startsAt,
          clubId: row.clubId,
          sourceId: row.sourceId ?? undefined,
          url: row.url ?? undefined,
          moderationStatus: EventModerationStatus.APPROVED,
          moderatedAt: existing.moderatedAt ?? new Date(),
          moderatedByUserId: existing.moderatedByUserId ?? opts.staffUserId,
          publishedAt: existing.publishedAt ?? new Date(),
        },
      });
      upserted += 1;
      continue;
    }
    await prisma.eventCandidate.create({
      data: {
        clubId: row.clubId,
        sourceId: row.sourceId ?? undefined,
        title: row.title,
        body: row.body,
        url: row.url ?? undefined,
        startsAt: row.startsAt,
        moderationStatus: EventModerationStatus.APPROVED,
        moderatedAt: new Date(),
        moderatedByUserId: opts.staffUserId,
        publishedAt: new Date(),
      },
    });
    upserted += 1;
  }
  return { upserted };
}
