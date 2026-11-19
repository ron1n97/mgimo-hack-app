"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, announceToStudents, fetchSchedule, markLessonMoved } from "@/lib/api";
import { getUser } from "@/lib/auth";
import type { ScheduleItem } from "@/lib/types";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";

function localIso(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysIso(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return localIso(d);
}

export default function StaffAnnouncePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<"deanery_announce" | "schedule_moved">(
    "deanery_announce",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lessons, setLessons] = useState<ScheduleItem[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(true);

  useEffect(() => {
    const user = getUser();
    if (user && user.role !== "staff" && user.role !== "admin") {
      router.replace("/today");
      return;
    }
    const from = localIso();
    const to = addDaysIso(from, 7);
    setLessonsLoading(true);
    void fetchSchedule(from, to)
      .then((rows) => setLessons(Array.isArray(rows) ? rows : []))
      .catch(() => setLessons([]))
      .finally(() => setLessonsLoading(false));
  }, [router]);

  async function onAnnounce(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await announceToStudents({
        title: title.trim(),
        body: body.trim(),
        kind,
      });
      setMessage(`Отправлено студентам: ${res.count}`);
      setTitle("");
      setBody("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось отправить");
    } finally {
      setBusy(false);
    }
  }

  async function onMove(lesson: ScheduleItem) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await markLessonMoved(lesson.id, {
        isMoved: true,
        note: `Перенос пары «${lesson.title}» ${lesson.date} ${lesson.startTime}–${lesson.endTime}`,
      });
      setLessons((prev) =>
        prev.map((l) =>
          l.id === lesson.id ? { ...l, isMoved: true } : l,
        ),
      );
      setMessage(`Пара отмечена перенесённой. Уведомлений: ${res.notified}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось отметить перенос");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="animate-rise mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="font-serif text-3xl text-ink">Объявления и переносы</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Новости деканата уходят в ленту и на Web Push (если VAPID настроен). Перенос
          пары помечает слот и уведомляет группу.
        </p>
      </header>

      <form
        onSubmit={onAnnounce}
        className="space-y-3 rounded-2xl border border-cream-deep bg-white/60 p-5"
      >
        <h2 className="font-serif text-xl text-ink">Объявление</h2>
        <label className="block text-sm">
          <span className="text-ink-muted">Заголовок</span>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-xl border border-cream-deep bg-cream/40 px-3 py-2.5 outline-none ring-copper/40 focus:ring-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-ink-muted">Текст</span>
          <textarea
            required
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="mt-1 w-full rounded-xl border border-cream-deep bg-cream/40 px-3 py-2.5 outline-none ring-copper/40 focus:ring-2"
          />
        </label>
        <label className="block text-sm">
          <span className="text-ink-muted">Тип</span>
          <select
            value={kind}
            onChange={(e) =>
              setKind(e.target.value as "deanery_announce" | "schedule_moved")
            }
            className="mt-1 w-full rounded-xl border border-cream-deep bg-cream/40 px-3 py-2.5 outline-none ring-copper/40 focus:ring-2"
          >
            <option value="deanery_announce">Новость деканата</option>
            <option value="schedule_moved">Изменение расписания</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-copper py-3 text-sm font-semibold text-cream disabled:opacity-60"
        >
          {busy ? "Отправляем…" : "Разослать студентам"}
        </button>
      </form>

      <section className="space-y-3">
        <h2 className="font-serif text-xl text-ink">Перенос пары (неделя вперёд)</h2>
        <p className="text-sm text-ink-muted">
          Нужна группа просмотра в профиле сотрудника — тогда здесь появятся пары.
        </p>
        {lessonsLoading ? <LoadingState label="Грузим пары…" /> : null}
        {!lessonsLoading && lessons.length === 0 ? (
          <p className="text-sm text-ink-muted">Пар нет — выберите группу в профиле.</p>
        ) : null}
        <ul className="divide-y divide-cream-deep overflow-hidden rounded-2xl border border-cream-deep bg-white/50">
          {lessons.map((lesson) => (
            <li
              key={lesson.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
            >
              <div>
                <p className="font-medium text-ink">
                  {lesson.title}
                  {lesson.isMoved ? (
                    <span className="ml-2 text-xs font-normal text-copper">перенос</span>
                  ) : null}
                </p>
                <p className="text-xs text-ink-muted">
                  {lesson.date} · {lesson.startTime}–{lesson.endTime}
                  {lesson.room ? ` · ${lesson.room}` : ""}
                </p>
              </div>
              <button
                type="button"
                disabled={busy || Boolean(lesson.isMoved)}
                onClick={() => void onMove(lesson)}
                className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs text-ink-muted hover:border-ink/30 hover:text-ink disabled:opacity-50"
              >
                {lesson.isMoved ? "Уже отмечено" : "Отметить перенос"}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {error ? <ErrorState message={error} /> : null}
      {message ? (
        <p className="rounded-xl border border-emerald-900/15 bg-emerald-900/5 px-3 py-2 text-sm text-emerald-900">
          {message}
        </p>
      ) : null}
    </div>
  );
}
