import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ClubMembershipRole,
  ClubStatus,
  EventModerationStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { detectSourceKind, slugifyTag } from './club-slug';
import {
  canModerateClubs,
  clubListVisibilityWhere,
} from './digest-filter';
import { CreateClubDto } from './dto/create-club.dto';
import {
  ConfirmClubDto,
  CreateDigestSourceDto,
  DigestToggleDto,
  SetTagSubscriptionsDto,
  StaffCreateClubDto,
} from './dto/staff-club.dto';
import {
  syncTelegramDigest,
  type TelegramIngestResult,
} from './telegram-ingest';
import { moscowDateString, moscowWeekBounds } from '../today/today-digest';

const clubInclude = {
  tags: { include: { tag: true } },
  sources: true,
  memberships: {
    select: { userId: true, role: true },
  },
} satisfies Prisma.ClubInclude;

@Injectable()
export class ClubsService {
  constructor(private readonly prisma: PrismaService) {}

  async listTags() {
    return this.prisma.tag.findMany({ orderBy: { name: 'asc' } });
  }

  async listClubs(params: {
    actorUserId: string;
    actorRole: string;
    tag?: string;
    q?: string;
    status?: ClubStatus;
  }) {
    const visibility = clubListVisibilityWhere({
      actorRole: params.actorRole,
      actorUserId: params.actorUserId,
    });

    const and: Prisma.ClubWhereInput[] = [{ OR: visibility.OR as Prisma.ClubWhereInput[] }];

    if (params.status) {
      and.push({ status: params.status });
    }
    if (params.q?.trim()) {
      and.push({
        name: { contains: params.q.trim(), mode: 'insensitive' },
      });
    }
    if (params.tag?.trim()) {
      const slug = slugifyTag(params.tag);
      and.push({
        tags: {
          some: {
            OR: [{ tag: { slug } }, { tag: { name: params.tag.trim() } }],
          },
        },
      });
    }

    return this.prisma.club.findMany({
      where: { AND: and },
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
      include: clubInclude,
    });
  }

  async getClub(
    id: string,
    actorUserId: string,
    actorRole: string,
  ) {
    const club = await this.prisma.club.findUnique({
      where: { id },
      include: clubInclude,
    });
    if (!club) {
      throw new NotFoundException('Club not found');
    }
    if (club.status === ClubStatus.CONFIRMED || canModerateClubs(actorRole)) {
      return club;
    }
    const isOwner =
      club.createdByUserId === actorUserId ||
      club.memberships.some((m) => m.userId === actorUserId);
    if (!isOwner) {
      throw new NotFoundException('Club not found');
    }
    return club;
  }

  async createClub(studentUserId: string, dto: CreateClubDto) {
    const tagIds = await this.ensureTags(dto.tags ?? []);
    return this.prisma.club.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim(),
        structureNote: dto.structureNote?.trim(),
        websiteUrl: dto.websiteUrl?.trim(),
        status: ClubStatus.DRAFT,
        createdByUserId: studentUserId,
        memberships: {
          create: {
            userId: studentUserId,
            role: ClubMembershipRole.OWNER,
          },
        },
        tags: {
          create: tagIds.map((tagId) => ({ tagId })),
        },
        sources: {
          create: (dto.sourceUrls ?? []).map((url) => ({
            url: url.trim(),
            kind: detectSourceKind(url),
            createdByUserId: studentUserId,
          })),
        },
      },
      include: clubInclude,
    });
  }

  async staffCreateClub(staffUserId: string, dto: StaffCreateClubDto) {
    const tagIds = await this.ensureTags(dto.tags ?? []);
    const confirmed = dto.confirmed !== false;
    return this.prisma.club.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim(),
        status: confirmed ? ClubStatus.CONFIRMED : ClubStatus.DRAFT,
        digestEnabled: Boolean(dto.digestEnabled),
        createdByUserId: staffUserId,
        confirmedAt: confirmed ? new Date() : null,
        confirmedByUserId: confirmed ? staffUserId : null,
        tags: { create: tagIds.map((tagId) => ({ tagId })) },
        sources: {
          create: (dto.sourceUrls ?? []).map((url) => ({
            url: url.trim(),
            kind: detectSourceKind(url),
            createdByUserId: staffUserId,
            enabled: true,
          })),
        },
      },
      include: clubInclude,
    });
  }

  async confirmClub(
    id: string,
    staffUserId: string,
    actorRole: string,
    dto: ConfirmClubDto,
  ) {
    this.assertStaff(actorRole);
    await this.requireClub(id);
    return this.prisma.club.update({
      where: { id },
      data: {
        status: ClubStatus.CONFIRMED,
        confirmedAt: new Date(),
        confirmedByUserId: staffUserId,
        ...(dto.digestEnabled !== undefined
          ? { digestEnabled: dto.digestEnabled }
          : {}),
      },
      include: clubInclude,
    });
  }

  async setDigest(
    id: string,
    actorRole: string,
    dto: DigestToggleDto,
  ) {
    this.assertStaff(actorRole);
    await this.requireClub(id);
    return this.prisma.club.update({
      where: { id },
      data: { digestEnabled: dto.digestEnabled },
      include: clubInclude,
    });
  }

  async addDigestSource(staffUserId: string, dto: CreateDigestSourceDto) {
    if (dto.clubId) {
      await this.requireClub(dto.clubId);
    }
    return this.prisma.clubSource.upsert({
      where: { url: dto.url.trim() },
      create: {
        url: dto.url.trim(),
        kind: detectSourceKind(dto.url),
        title: dto.title?.trim(),
        clubId: dto.clubId,
        enabled: dto.enabled ?? true,
        createdByUserId: staffUserId,
      },
      update: {
        title: dto.title?.trim(),
        clubId: dto.clubId ?? undefined,
        enabled: dto.enabled ?? true,
      },
    });
  }

  async getInterests(userId: string) {
    const [tags, clubs] = await Promise.all([
      this.prisma.studentTagSubscription.findMany({
        where: { userId },
        include: { tag: true },
      }),
      this.prisma.clubSubscription.findMany({
        where: { userId },
        include: {
          club: {
            include: { tags: { include: { tag: true } } },
          },
        },
      }),
    ]);
    return {
      tags: tags.map((t) => t.tag),
      clubs: clubs.map((c) => c.club),
    };
  }

  /**
   * Subscriptions are always scoped to JWT userId — never accept foreign userId (IDOR).
   */
  async setTagSubscriptions(userId: string, dto: SetTagSubscriptionsDto) {
    const unique = [...new Set(dto.tagIds)];
    if (unique.length) {
      const found = await this.prisma.tag.findMany({
        where: { id: { in: unique } },
        select: { id: true },
      });
      if (found.length !== unique.length) {
        throw new NotFoundException('One or more tags not found');
      }
    }
    await this.prisma.$transaction([
      this.prisma.studentTagSubscription.deleteMany({ where: { userId } }),
      ...(unique.length
        ? [
            this.prisma.studentTagSubscription.createMany({
              data: unique.map((tagId) => ({ userId, tagId })),
            }),
          ]
        : []),
    ]);
    return this.getInterests(userId);
  }

  async subscribeClub(userId: string, clubId: string) {
    const club = await this.requireClub(clubId);
    if (club.status !== ClubStatus.CONFIRMED) {
      throw new NotFoundException('Club not found');
    }
    await this.prisma.clubSubscription.upsert({
      where: { userId_clubId: { userId, clubId } },
      create: { userId, clubId },
      update: {},
    });
    return this.getInterests(userId);
  }

  async unsubscribeClub(userId: string, clubId: string) {
    await this.prisma.clubSubscription.deleteMany({
      where: { userId, clubId },
    });
    return this.getInterests(userId);
  }

  async listDigestFeed(params: {
    actorUserId: string;
    personalized?: boolean;
  }) {
    const include = {
      club: {
        include: { tags: { include: { tag: true } } },
      },
      source: true,
    } as const;

    if (!params.personalized) {
      // Public «Что сегодня / Недельный» — current MSK week.
      const week = moscowWeekBounds(moscowDateString());
      const weekStart = new Date(`${week.from}T00:00:00+03:00`);
      const weekEnd = new Date(`${week.to}T23:59:59.999+03:00`);
      const events = await this.prisma.eventCandidate.findMany({
        where: {
          moderationStatus: EventModerationStatus.APPROVED,
          startsAt: { gte: weekStart, lte: weekEnd },
        },
        orderBy: [{ startsAt: 'desc' }, { createdAt: 'desc' }],
        take: 200,
        include,
      });
      return { mode: 'all' as const, items: events };
    }

    // Personalized: filter by subscriptions in SQL before take, so quieter clubs
    // are not crowded out by louder channels in a global newest-200 slice.
    const interests = await this.getInterests(params.actorUserId);
    const clubIds = interests.clubs.map((c) => c.id);
    const tagIds = interests.tags.map((t) => t.id);
    if (!clubIds.length && !tagIds.length) {
      return {
        mode: 'personalized' as const,
        items: [],
        interests: { tagIds, clubIds },
      };
    }

    const rollingStart = new Date(Date.now() - 21 * 24 * 3600 * 1000);
    const interestOr: Prisma.EventCandidateWhereInput[] = [];
    if (clubIds.length) {
      interestOr.push({ clubId: { in: clubIds } });
    }
    if (tagIds.length) {
      interestOr.push({
        club: { tags: { some: { tagId: { in: tagIds } } } },
      });
    }
    const events = await this.prisma.eventCandidate.findMany({
      where: {
        moderationStatus: EventModerationStatus.APPROVED,
        startsAt: { gte: rollingStart },
        OR: interestOr,
      },
      orderBy: [{ startsAt: 'desc' }, { createdAt: 'desc' }],
      take: 80,
      include,
    });
    return {
      mode: 'personalized' as const,
      items: events,
      interests: { tagIds, clubIds },
    };
  }

  async moderateEvent(
    eventId: string,
    staffUserId: string,
    actorRole: string,
    status: 'APPROVED' | 'REJECTED',
  ) {
    this.assertStaff(actorRole);
    const event = await this.prisma.eventCandidate.findUnique({
      where: { id: eventId },
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    return this.prisma.eventCandidate.update({
      where: { id: eventId },
      data: {
        moderationStatus:
          status === 'APPROVED'
            ? EventModerationStatus.APPROVED
            : EventModerationStatus.REJECTED,
        moderatedAt: new Date(),
        moderatedByUserId: staffUserId,
        publishedAt: status === 'APPROVED' ? new Date() : null,
      },
    });
  }

  async listPendingEvents(actorRole: string) {
    this.assertStaff(actorRole);
    return this.prisma.eventCandidate.findMany({
      where: { moderationStatus: EventModerationStatus.PENDING },
      orderBy: { createdAt: 'desc' },
      include: { club: true, source: true },
    });
  }

  /**
   * Scrape public t.me/s previews for enabled TELEGRAM sources → APPROVED feed.
   * Staff gate = digestEnabled / source.enabled (no Bot API token).
   */
  async ingestTelegramDigest(actorRole?: string): Promise<TelegramIngestResult> {
    if (actorRole !== undefined) {
      this.assertStaff(actorRole);
    }
    return syncTelegramDigest(this.prisma);
  }

  private assertStaff(actorRole: string) {
    if (!canModerateClubs(actorRole)) {
      throw new ForbiddenException('Staff only');
    }
  }

  private async requireClub(id: string) {
    const club = await this.prisma.club.findUnique({ where: { id } });
    if (!club) {
      throw new NotFoundException('Club not found');
    }
    return club;
  }

  private async ensureTags(names: string[]): Promise<string[]> {
    const ids: string[] = [];
    for (const raw of names) {
      const name = raw.trim();
      if (!name) continue;
      const slug = slugifyTag(name);
      const tag = await this.prisma.tag.upsert({
        where: { slug },
        create: { slug, name },
        update: { name },
      });
      ids.push(tag.id);
    }
    return ids;
  }
}
