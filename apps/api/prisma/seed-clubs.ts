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
  const stubs = [
    {
      title: 'Демо: что сегодня в клубе',
      body: 'Ежедневный дайджест — stub для экрана «Сегодня» (без live-ingest).',
      startsAt: new Date(now + 2 * 3600 * 1000),
      moderationStatus: EventModerationStatus.APPROVED,
    },
    {
      title: 'Демо: открытая тренировка ССК',
      body: 'Кандидат из дайджеста — ждёт модерации коллеги перед афишей.',
      startsAt: new Date(now + 3 * 24 * 3600 * 1000),
      moderationStatus: EventModerationStatus.PENDING,
    },
    {
      title: 'Демо: товарищеский матч',
      body: 'Недельный дайджест — одобрено, видно в ленте и на «Сегодня».',
      startsAt: new Date(now + 4 * 24 * 3600 * 1000),
      moderationStatus: EventModerationStatus.APPROVED,
    },
    {
      title: 'Демо: недельный обзор клубов',
      body: 'Сводка на неделю: встречи, дедлайны заявок в клубы, анонсы.',
      startsAt: new Date(now + 5 * 24 * 3600 * 1000),
      moderationStatus: EventModerationStatus.APPROVED,
    },
  ] as const;

  for (const stub of stubs) {
    const existing = await prisma.eventCandidate.findFirst({
      where: { title: stub.title },
    });
    if (existing) continue;
    await prisma.eventCandidate.create({
      data: {
        clubId: club.id,
        sourceId,
        title: stub.title,
        body: stub.body,
        url: club.sources[0]?.url,
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

  // Ensure membership role type is referenced for prisma client tree-shake safety
  void ClubMembershipRole.OWNER;
}
