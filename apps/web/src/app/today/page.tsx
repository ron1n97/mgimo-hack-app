"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ApiError, fetchStudentTasksToday, fetchToday } from "@/lib/api";
import { getUser } from "@/lib/auth";
import type { LessonTaskItem, TodayHub, User } from "@/lib/types";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";

export default function TodayPage() {
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<TodayHub | null>(null);
  const [tasks, setTasks] = useState<LessonTaskItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const hub = await fetchToday();
      setData(hub);
      try {
        const todayTasks = await fetchStudentTasksToday();
        setTasks(Array.isArray(todayTasks) ? todayTasks : []);
      } catch {
        setTasks([]);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка загрузки");
      setData(null);
      setTasks([]);
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
        ) : (
          <p className="mt-1 text-sm text-ink-muted">
            <Link href="/profile" className="text-copper underline-offset-2 hover:underline">
              Выберите группу в профиле
            </Link>
            , чтобы видеть пары.
          </p>
        )}
      </header>

      {loading ? <LoadingState label="Собираем день…" /> : null}
      {error ? <ErrorState message={error} onRetry={load} /> : null}

      {!loading && !error && data ? (
        <>
          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <h2 className="font-serif text-xl text-ink">Пары сегодня</h2>
              <Link href="/schedule" className="text-sm text-copper">
                Календарь недели →
              </Link>
            </div>

            {data.lessons.length === 0 ? (
              <EmptyState
                title="На сегодня пар нет"
                description="Можно дышать — или откройте календарь на неделю."
              />
            ) : (
              <ul className="space-y-3">
                {data.lessons.map((lesson) => {
                  const isNext = data.nextLesson?.id === lesson.id;
                  return (
                    <li
                      key={lesson.id}
                      className={`rounded-2xl border px-4 py-4 ${
                        isNext
                          ? "border-copper/40 bg-ink text-cream shadow-soft"
                          : "border-cream-deep bg-white/50"
                      }`}
                    >
                      <p
                        className={`text-xs font-medium uppercase tracking-wide ${
                          isNext ? "text-copper" : "text-copper"
                        }`}
                      >
                        {lesson.startTime}–{lesson.endTime}
                        {lesson.kind ? ` · ${lesson.kind}` : ""}
                        {isNext ? " · сейчас / следующая" : ""}
                      </p>
                      <h3
                        className={`mt-1 font-serif text-lg ${
                          isNext ? "text-cream" : "text-ink"
                        }`}
                      >
                        {lesson.title}
                      </h3>
                      <p
                        className={`mt-2 text-sm ${
                          isNext ? "text-cream/80" : "text-ink-muted"
                        }`}
                      >
                        {[
                          lesson.room
                            ? `ауд. ${lesson.room}${lesson.building ? `, ${lesson.building}` : ""}`
                            : null,
                          lesson.teacher,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "Преподаватель и кабинет уточняются"}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {data.importantUnread.length > 0 ? (
            <section aria-label="Важные непрочитанные">
              <div className="mb-2 flex items-end justify-between gap-3">
                <h2 className="font-serif text-xl text-ink">Важно сейчас</h2>
                <Link href="/notifications" className="text-sm text-copper">
                  Вся лента →
                </Link>
              </div>
              <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {data.importantUnread.map((n) => (
                  <li key={n.id} className="min-w-[14rem] max-w-[18rem] shrink-0">
                    <Link
                      href="/notifications"
                      className="block rounded-2xl border border-copper/25 bg-white/70 px-3 py-3 transition hover:border-copper/50"
                    >
                      <p className="text-[10px] uppercase tracking-wide text-copper">
                        {n.kind?.startsWith("grade_")
                          ? "Оценка"
                          : n.kind?.startsWith("digest_")
                            ? "Дайджест"
                            : "Событие"}
                      </p>
                      <p className="mt-1 line-clamp-2 font-medium text-ink">{n.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-ink-muted">{n.body}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <h2 className="font-serif text-xl text-ink">Задания</h2>
              <Link href="/tasks" className="text-sm text-copper">
                Все →
              </Link>
            </div>
            {tasks.length === 0 ? (
              <p className="text-sm text-ink-muted">На сегодня срочных заданий нет.</p>
            ) : (
              <ul className="space-y-2">
                {tasks.slice(0, 3).map((task) => (
                  <li
                    key={task.id}
                    className="rounded-xl border border-cream-deep bg-white/40 px-4 py-3"
                  >
                    <p className="font-medium text-ink">{task.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{task.body}</p>
                  </li>
                ))}
              </ul>
            )}
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
              <h2 className="font-serif text-xl text-ink">Оценки</h2>
              <Link href="/grades" className="text-sm text-copper">
                Все
              </Link>
            </div>
            {data.recentGrades.length === 0 ? (
              <EmptyState
                title="Оценок пока нет"
                description="Когда появятся результаты — покажем здесь."
              />
            ) : (
              <ul className="space-y-2">
                {data.recentGrades.map((g) => (
                  <li
                    key={g.id}
                    className="flex items-center justify-between rounded-xl border border-cream-deep bg-white/40 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-ink">{g.subject}</p>
                      <p className="text-xs text-ink-muted">
                        {g.date}
                        {g.kind ? ` · ${g.kind}` : ""}
                        {g.isDebt ? " · долг" : ""}
                      </p>
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
