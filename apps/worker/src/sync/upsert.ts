import type { PrismaClient, Prisma } from '@prisma/client';
import type { RuzLesson } from '../ruz/client';
import { parseRuzDate } from '../ruz/dates';

export type UpsertLessonInput = {
  groupRuzId: string;
  groupLabel: string;
  lesson: RuzLesson;
};

export function lessonBegin(lesson: RuzLesson): string {
  return String(lesson.beginLesson ?? lesson.begin ?? '00:00');
}

export function lessonEnd(lesson: RuzLesson): string {
  return String(lesson.endLesson ?? lesson.end ?? '00:00');
}

export function lessonDiscipline(lesson: RuzLesson): string {
  return String(
    lesson.discipline ?? lesson.disciplineFullName ?? 'Без названия',
  );
}

function optionalString(value: unknown): string | null {
  if (value == null || value === '') return null;
  return String(value);
}

/**
 * Stable external id: RUZ schedule payloads expose `lessonOid`, not `id`.
 * Falling back to group:date:begin:discipline collapses same-discipline parallels.
 */
export function buildRuzExternalId(
  lesson: RuzLesson,
  groupRuzId: string,
): string {
  if (lesson.lessonOid != null) return String(lesson.lessonOid);
  // Last-resort fallback — include subgroup/stream so parallels stay distinct.
  const date = String(lesson.date ?? '');
  const begin = lessonBegin(lesson);
  const disc = lessonDiscipline(lesson);
  const sub = optionalString(lesson.subGroupOid) ?? optionalString(lesson.subGroup) ?? '';
  const stream =
    optionalString(lesson.streamOid) ?? optionalString(lesson.stream) ?? '';
  return `${groupRuzId}:${date}:${begin}:${disc}:${sub}:${stream}`;
}

export type MappedScheduleLesson = {
  ruzExternalId: string;
  groupRuzId: string;
  groupLabel: string;
  date: Date;
  begin: string;
  end: string;
  discipline: string;
  lecturer: string | null;
  auditorium: string | null;
  building: string | null;
  kindOfWork: string | null;
  subGroup: string | null;
  subGroupOid: string | null;
  stream: string | null;
  streamOid: string | null;
  isCancelled: boolean;
  isMoved: boolean;
  rawJson: Prisma.InputJsonValue;
};

export function mapRuzLessonFields(
  lesson: RuzLesson,
  groupRuzId: string,
  groupLabel: string,
): MappedScheduleLesson {
  if (!lesson.date) {
    throw new Error('RUZ lesson missing date');
  }
  return {
    ruzExternalId: buildRuzExternalId(lesson, groupRuzId),
    groupRuzId,
    groupLabel,
    date: parseRuzDate(String(lesson.date)),
    begin: lessonBegin(lesson),
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
    isCancelled: Boolean(
      (lesson as { canceled?: boolean }).canceled ??
        (lesson as { isCancelled?: boolean }).isCancelled,
    ),
    isMoved: Boolean((lesson as { isMoved?: boolean }).isMoved),
    rawJson: lesson as Prisma.InputJsonValue,
  };
}

/**
 * Upsert a single RUZ lesson into ScheduleLesson.
 */
export async function upsertScheduleLesson(
  prisma: PrismaClient,
  input: UpsertLessonInput,
): Promise<void> {
  const { groupRuzId, groupLabel, lesson } = input;
  if (!lesson.date) return;

  const data = mapRuzLessonFields(lesson, groupRuzId, groupLabel);

  await prisma.scheduleLesson.upsert({
    where: {
      ruzExternalId_groupRuzId_date_begin: {
        ruzExternalId: data.ruzExternalId,
        groupRuzId: data.groupRuzId,
        date: data.date,
        begin: data.begin,
      },
    },
    create: data,
    update: data,
  });
}

export async function upsertLessonsBatch(
  prisma: PrismaClient,
  groupRuzId: string,
  groupLabel: string,
  lessons: RuzLesson[],
): Promise<number> {
  let count = 0;
  for (const lesson of lessons) {
    await upsertScheduleLesson(prisma, { groupRuzId, groupLabel, lesson });
    count += 1;
  }
  return count;
}
