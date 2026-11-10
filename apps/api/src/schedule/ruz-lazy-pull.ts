import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  shouldApplyRuzLessonUpsert,
  shouldSkipGroupRuzSync,
  type ScheduleLessonSource,
} from './schedule-sot';

type RuzLesson = {
  lessonOid?: number | string;
  date?: string;
  beginLesson?: string;
  endLesson?: string;
  begin?: string;
  end?: string;
  discipline?: string;
  disciplineFullName?: string;
  lecturer?: string;
  lecturer_title?: string;
  auditorium?: string;
  building?: string;
  kindOfWork?: string;
  stream?: string;
  streamOid?: number | string;
  subGroup?: string;
  subGroupOid?: number | string;
  canceled?: boolean;
  isCancelled?: boolean;
  isMoved?: boolean;
  [key: string]: unknown;
};

function optionalString(value: unknown): string | null {
  if (value == null || value === '') return null;
  return String(value);
}

function lessonBegin(lesson: RuzLesson): string {
  return String(lesson.beginLesson ?? lesson.begin ?? '00:00');
}

function lessonEnd(lesson: RuzLesson): string {
  return String(lesson.endLesson ?? lesson.end ?? '00:00');
}

function lessonDiscipline(lesson: RuzLesson): string {
  return String(
    lesson.discipline ?? lesson.disciplineFullName ?? 'Без названия',
  );
}

function parseRuzDate(value: string): Date {
  const normalized = value.includes('.')
    ? value.replace(/\./g, '-')
    : value.slice(0, 10);
  const [y, m, d] = normalized.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatRuzDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

/** Monday UTC of week containing ref (approx local Monday via UTC calendar). */
export function startOfWeekUtc(ref: Date = new Date()): Date {
  const d = new Date(
    Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate()),
  );
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

export function defaultSyncRange(ref: Date = new Date()): {
  from: Date;
  to: Date;
  startStr: string;
  finishStr: string;
} {
  const from = startOfWeekUtc(ref);
  const to = new Date(from);
  to.setUTCDate(to.getUTCDate() + 13);
  return {
    from,
    to,
    startStr: formatRuzDate(from),
    finishStr: formatRuzDate(to),
  };
}

export function buildRuzExternalId(
  lesson: RuzLesson,
  groupRuzId: string,
): string {
  if (lesson.lessonOid != null) return String(lesson.lessonOid);
  const date = String(lesson.date ?? '');
  const begin = lessonBegin(lesson);
  const disc = lessonDiscipline(lesson);
  const sub =
    optionalString(lesson.subGroupOid) ?? optionalString(lesson.subGroup) ?? '';
  const stream =
    optionalString(lesson.streamOid) ?? optionalString(lesson.stream) ?? '';
  return `${groupRuzId}:${date}:${begin}:${disc}:${sub}:${stream}`;
}

function parseRuzArray(data: unknown, context: string): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const row = data as Record<string, unknown>;
    const message =
      row.message != null
        ? String(row.message)
        : row.error != null
          ? String(row.error)
          : JSON.stringify(data);
    throw new Error(`RUZ schedule error for ${context}: ${message}`);
  }
  throw new Error(`RUZ schedule unexpected payload for ${context}`);
}

export async function fetchRuzScheduleForGroup(
  groupRuzId: string,
  startStr: string,
  finishStr: string,
  baseUrl = process.env.RUZ_BASE_URL ?? 'https://ruz.mgimo.ru',
  fetchImpl: typeof fetch = fetch,
): Promise<RuzLesson[]> {
  const url = new URL(`/api/schedule/group/${groupRuzId}`, baseUrl);
  url.searchParams.set('start', startStr);
  url.searchParams.set('finish', finishStr);
  const res = await fetchImpl(url);
  if (!res.ok) {
    throw new Error(
      `RUZ schedule failed ${res.status} for group=${groupRuzId}`,
    );
  }
  return parseRuzArray(await res.json(), `group=${groupRuzId}`) as RuzLesson[];
}

/**
 * Lazy pull on miss: if DB has no lessons for group+range, fetch RUZ and
 * create-only insert. Existing rows are never overwritten.
 */
export async function ensureGroupScheduleFromRuz(
  prisma: PrismaService,
  opts: {
    groupRuzId: string;
    groupLabel?: string;
    from?: Date;
    to?: Date;
    fetchImpl?: typeof fetch;
  },
): Promise<{ pulled: boolean; created: number }> {
  const range =
    opts.from && opts.to
      ? {
          from: opts.from,
          to: opts.to,
          startStr: formatRuzDate(opts.from),
          finishStr: formatRuzDate(opts.to),
        }
      : defaultSyncRange();

  const localCount = await prisma.scheduleLesson.count({
    where: {
      groupRuzId: opts.groupRuzId,
      date: { gte: range.from, lte: range.to },
    },
  });

  if (shouldSkipGroupRuzSync(localCount)) {
    return { pulled: false, created: 0 };
  }

  const lessons = await fetchRuzScheduleForGroup(
    opts.groupRuzId,
    range.startStr,
    range.finishStr,
    undefined,
    opts.fetchImpl,
  );

  const label = opts.groupLabel ?? opts.groupRuzId;
  let created = 0;

  for (const lesson of lessons) {
    if (!lesson.date) continue;
    const ruzExternalId = buildRuzExternalId(lesson, opts.groupRuzId);
    const date = parseRuzDate(String(lesson.date));
    const begin = lessonBegin(lesson);

    const existing = await prisma.scheduleLesson.findUnique({
      where: {
        ruzExternalId_groupRuzId_date_begin: {
          ruzExternalId,
          groupRuzId: opts.groupRuzId,
          date,
          begin,
        },
      },
      select: { source: true },
    });

    if (
      !shouldApplyRuzLessonUpsert(
        existing?.source as ScheduleLessonSource | undefined,
      )
    ) {
      continue;
    }

    const data: Prisma.ScheduleLessonCreateInput = {
      ruzExternalId,
      groupRuzId: opts.groupRuzId,
      groupLabel: label,
      date,
      begin,
      end: lessonEnd(lesson),
      discipline: lessonDiscipline(lesson),
      lecturer:
        lesson.lecturer != null
          ? String(lesson.lecturer)
          : lesson.lecturer_title != null
            ? String(lesson.lecturer_title)
            : null,
      auditorium: optionalString(lesson.auditorium),
      building: optionalString(lesson.building),
      kindOfWork: optionalString(lesson.kindOfWork),
      subGroup: optionalString(lesson.subGroup),
      subGroupOid: optionalString(lesson.subGroupOid),
      stream: optionalString(lesson.stream),
      streamOid: optionalString(lesson.streamOid),
      source: 'RUZ',
      isCancelled: Boolean(lesson.canceled ?? lesson.isCancelled),
      isMoved: Boolean(lesson.isMoved),
      rawJson: lesson as Prisma.InputJsonValue,
    };

    await prisma.scheduleLesson.create({ data });
    created += 1;
  }

  return { pulled: true, created };
}
