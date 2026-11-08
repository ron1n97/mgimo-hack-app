import type {
  TodayResponse,
  ScheduleLessonDto,
  RequestTicketDto,
  ScheduleRangeResponse,
} from '@dekanat/shared';

function lessonLine(l: ScheduleLessonDto): string {
  const place = [l.building, l.auditorium].filter(Boolean).join(' · ');
  const meta = [l.kindOfWork, l.lecturer].filter(Boolean).join(' · ');
  const flags =
    (l.isCancelled ? ' [отмена]' : '') + (l.isMoved ? ' [перенос]' : '');
  return `• ${l.begin}–${l.end} ${l.discipline}${flags}${place ? `\n  ${place}` : ''}${meta ? `\n  ${meta}` : ''}`;
}

export function formatToday(data: TodayResponse): string {
  const header = `Сегодня (${data.date})`;
  if (!data.lessons.length) {
    return `${header}\nПар нет.`;
  }
  const body = data.lessons.map(lessonLine).join('\n\n');
  const extra = data.summary ? `\n\n${data.summary}` : '';
  return `${header}\n\n${body}${extra}`;
}

export function formatSchedule(data: ScheduleRangeResponse): string {
  if (!data.lessons.length) {
    return `Расписание ${data.from} — ${data.to}\nПар нет.`;
  }
  const byDate = new Map<string, ScheduleLessonDto[]>();
  for (const lesson of data.lessons) {
    const list = byDate.get(lesson.date) ?? [];
    list.push(lesson);
    byDate.set(lesson.date, list);
  }
  const chunks: string[] = [`Расписание ${data.from} — ${data.to}`];
  for (const [date, lessons] of [...byDate.entries()].sort()) {
    chunks.push(`\n${date}`);
    chunks.push(lessons.map(lessonLine).join('\n'));
  }
  return chunks.join('\n');
}

export function formatRequests(items: RequestTicketDto[]): string {
  if (!items.length) return 'Открытых заявок нет.';
  return items
    .map(
      (t) =>
        `• [${t.status}] ${t.title}\n  ${t.type} · ${t.createdAt.slice(0, 10)}`,
    )
    .join('\n\n');
}
