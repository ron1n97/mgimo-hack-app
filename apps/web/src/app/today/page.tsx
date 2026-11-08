"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ApiError, fetchToday } from "@/lib/api";
import { getUser } from "@/lib/auth";
import type { TodayHub, User } from "@/lib/types";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";

export default function TodayPage() {
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<TodayHub | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const hub = await fetchToday();
      setData(hub);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка загрузки");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setUser(getUser());
    void load();
  }, [load]);

  return (
    <div className="animate-rise space-y-6">
      <header>
        <p className="text-sm text-ink-muted">
          {new Date().toLocaleDateString("ru-RU", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
        <h1 className="mt-1 font-serif text-3xl text-ink">
          {user ? `Привет, ${user.fullName.split(" ")[0]}` : "Сегодня"}
        </h1>
        {user?.groupName ? (
          <p className="mt-1 text-sm text-ink-muted">Группа {user.groupName}</p>
        ) : null}
      </header>

      {loading ? <LoadingState label="Собираем день…" /> : null}
      {error ? <ErrorState message={error} onRetry={load} /> : null}

      {!loading && !error && data ? (
        <>
          <section className="rounded-2xl bg-ink p-5 text-cream shadow-soft">
            <p className="text-xs uppercase tracking-wider text-cream/60">Следующая пара</p>
            {data.nextLesson ? (
              <div className="mt-3">
                <h2 className="font-serif text-2xl leading-snug">{data.nextLesson.title}</h2>
                <p className="mt-2 text-sm text-cream/80">
                  {data.nextLesson.startTime}–{data.nextLesson.endTime}
                  {data.nextLesson.room ? ` · ${data.nextLesson.room}` : ""}
                </p>
                {data.nextLesson.teacher ? (
                  <p className="mt-1 text-sm text-cream/60">{data.nextLesson.teacher}</p>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 text-sm text-cream/75">На сегодня пар нет — можно дышать.</p>
            )}
            <Link
              href="/schedule"
              className="mt-4 inline-block text-sm text-copper underline-offset-4 hover:underline"
            >
              Всё расписание →
            </Link>
          </section>

          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/requests"
              className="rounded-2xl border border-cream-deep bg-white/50 p-4 transition hover:border-copper/40"
            >
              <p className="text-xs uppercase tracking-wide text-ink-muted">Заявки</p>
              <p className="mt-2 font-serif text-3xl text-ink">{data.openRequests}</p>
              <p className="mt-1 text-sm text-ink-muted">открытых</p>
            </Link>
            <Link
              href="/notifications"
              className="rounded-2xl border border-cream-deep bg-white/50 p-4 transition hover:border-copper/40"
            >
              <p className="text-xs uppercase tracking-wide text-ink-muted">Уведомления</p>
              <p className="mt-2 font-serif text-3xl text-ink">{data.unreadNotifications}</p>
              <p className="mt-1 text-sm text-ink-muted">непрочитанных</p>
            </Link>
          </div>

          <section>
            <div className="mb-3 flex items-end justify-between">
              <h2 className="font-serif text-xl text-ink">Недавние оценки</h2>
              <Link href="/grades" className="text-sm text-copper">
                Все
              </Link>
            </div>
            {data.recentGrades.length === 0 ? (
              <EmptyState title="Пока пусто" description="Оценки появятся после синка или сида API." />
            ) : (
              <ul className="space-y-2">
                {data.recentGrades.map((g) => (
                  <li
                    key={g.id}
                    className="flex items-center justify-between rounded-xl border border-cream-deep bg-white/40 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-ink">{g.subject}</p>
                      <p className="text-xs text-ink-muted">{g.date}</p>
                    </div>
                    <span className="font-serif text-xl text-copper">{g.value}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
