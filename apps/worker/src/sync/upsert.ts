import type { PrismaClient, Prisma } from '@prisma/client';
import type { RuzLesson } from '../ruz/client';
import { parseRuzDate } from '../ruz/dates';

export type UpsertLessonInput = {
  groupRuzId: string;
  groupLabel: string;
  lesson: RuzLesson;
};

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

function externalId(lesson: RuzLesson, groupRuzId: string): string {
  if (lesson.id != null) return String(lesson.id);
  const date = String(lesson.date ?? '');
  const begin = lessonBegin(lesson);
  const disc = lessonDiscipline(lesson);
  return `${groupRuzId}:${date}:${begin}:${disc}`;
}

/**
 * Upsert a single RUZ lesson into ScheduleLesson.
 * Ready for production once Prisma client is generated against apps/api schema.
 */
export async function upsertScheduleLesson(
  prisma: PrismaClient,
  input: UpsertLessonInput,
): Promise<void> {
  const { groupRuzId, groupLabel, lesson } = input;
  if (!lesson.date) return;

  const date = parseRuzDate(String(lesson.date));
  const begin = lessonBegin(lesson);
  const ruzExternalId = externalId(lesson, groupRuzId);

  const data = {
    ruzExternalId,
    groupRuzId,
    groupLabel,
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
    auditorium: lesson.auditorium != null ? String(lesson.auditorium) : null,
    building: lesson.building != null ? String(lesson.building) : null,
    kindOfWork: lesson.kindOfWork != null ? String(lesson.kindOfWork) : null,
    isCancelled: Boolean(
      (lesson as { canceled?: boolean }).canceled ??
        (lesson as { isCancelled?: boolean }).isCancelled,
    ),
    isMoved: Boolean((lesson as { isMoved?: boolean }).isMoved),
    rawJson: lesson as Prisma.InputJsonValue,
  };

  await prisma.scheduleLesson.upsert({
    where: {
      ruzExternalId_groupRuzId_date_begin: {
        ruzExternalId,
        groupRuzId,
        date,
        begin,
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
