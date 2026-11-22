"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ApiError, fetchToday } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { summarizeDigestItem } from "@/lib/digest-summary";
import type { TodayHub, User } from "@/lib/types";
import {
  ListPanel,
  ListRow,
  NowChip,
  PageHeader,
  SectionHeader,
  SurfaceCard,
} from "@/components/campus";
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
      setData(await fetchToday());
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

  const needsGroup =
    user &&
    !user.groupName &&
    (user.role === "student" || user.role === "staff" || user.role === "admin");

  return (
    <div className="animate-rise space-y-8">
      <PageHeader
        title="Сегодня"
        action={{ href: "/schedule", label: "Неделя →" }}
      />

      {needsGroup ? (
        <p className="text-sm text-ink-muted">
          {user?.role === "student" ? (
            <>
              Группа ещё не привязана — откройте{" "}
              <Link href="/profile" className="font-medium text-link hover:underline">
                профиль
              </Link>
              .
            </>
          ) : (
            <>
              <Link href="/profile" className="font-medium text-link hover:underline">
                Выберите группу в профиле
              </Link>
              , чтобы видеть пары.
            </>
          )}
        </p>
      ) : null}

      {loading ? <LoadingState label="Собираем день…" /> : null}
      {error ? <ErrorState message={error} onRetry={load} /> : null}

      {!loading && !error && data ? (
        <>
          <section>
            <SectionHeader title="Пары сегодня" />

            {data.lessons.length === 0 ? (
              <EmptyState
                title="На сегодня пар нет"
                description="Можно дышать — или откройте календарь на неделю."
              />
            ) : (
              <ListPanel>
                {data.lessons.map((lesson) => {
                  const isNext = data.nextLesson?.id === lesson.id;
                  return (
                    <ListRow key={lesson.id} active={isNext}>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-copper">
                          {lesson.startTime}–{lesson.endTime}
                          {lesson.kind ? ` · ${lesson.kind}` : ""}
                        </p>
                        {isNext ? <NowChip /> : null}
                      </div>
                      <h3 className="mt-1 text-base font-semibold text-ink">
                        {lesson.title}
                      </h3>
                      <p className="mt-1 text-sm text-ink-muted">
                        {[
                          lesson.room
                            ? `ауд. ${lesson.room}${lesson.building ? `, ${lesson.building}` : ""}`
                            : null,
                          lesson.teacher,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "Преподаватель и кабинет уточняются"}
                      </p>
                    </ListRow>
                  );
                })}
              </ListPanel>
            )}
          </section>

          <section>
            <SectionHeader
              title="Дайджест"
              action={{ href: "/clubs", label: "Все →" }}
            />
            {data.clubEventsToday.length === 0 ? (
              <p className="text-sm text-ink-muted">
                На сегодня анонсов нет.{" "}
                <Link
                  href="/clubs#weekly-digest"
                  className="font-medium text-link hover:underline"
                >
                  Недельный дайджест
                </Link>
                {data.clubDigestWeek.items.length
                  ? ` · ещё ${data.clubDigestWeek.items.length}`
                  : ""}
              </p>
            ) : (
              <ListPanel>
                {data.clubEventsToday.map((ev) => {
                  const s = summarizeDigestItem(ev);
                  const when = [s.day, s.time].filter(Boolean).join(", ");
                  return (
                    <ListRow key={ev.id}>
                      <p className="text-xs text-ink-muted">
                        {[s.club, when].filter(Boolean).join(" · ")}
                      </p>
                      <p className="mt-1 font-medium text-ink">{s.title}</p>
                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-sm">
                        {s.registrationUrl ? (
                          <a
                            href={s.registrationUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-link hover:underline"
                          >
                            Регистрация
                          </a>
                        ) : null}
                        {s.postUrl ? (
                          <a
                            href={s.postUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-link hover:underline"
                          >
                            Пост →
                          </a>
                        ) : null}
                      </div>
                    </ListRow>
                  );
                })}
              </ListPanel>
            )}
            {data.clubDigestWeek.items.length > 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-cream-deep bg-cream px-4 py-3">
                <p className="text-sm text-ink">
                  Недельный дайджест · {data.clubDigestWeek.items.length}
                </p>
                <Link
                  href="/clubs#weekly-digest"
                  className="mt-1 inline-block text-sm font-medium text-link hover:underline"
                >
                  Открыть сводку →
                </Link>
              </div>
            ) : null}
          </section>

          {data.importantUnread.length > 0 ? (
            <section aria-label="Важные непрочитанные">
              <SectionHeader
                title="Важно сейчас"
                action={{ href: "/notifications", label: "Вся лента →" }}
              />
              <ListPanel>
                {data.importantUnread.map((n) => (
                  <ListRow key={n.id} href={`/notifications/${n.id}`}>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-accent">
                      {n.kind?.startsWith("grade_")
                        ? "Оценка"
                        : n.kind?.startsWith("digest_")
                          ? "Дайджест"
                          : "Событие"}
                    </p>
                    <p className="mt-1 line-clamp-2 font-medium text-ink">{n.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-ink-muted">{n.body}</p>
                  </ListRow>
                ))}
              </ListPanel>
            </section>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/requests">
              <SurfaceCard className="transition hover:border-copper/40">
                <p className="text-xs uppercase tracking-wide text-ink-muted">Заявки</p>
                <p className="mt-2 text-3xl font-semibold tabular-nums text-ink">
                  {data.openRequests}
                </p>
                <p className="mt-1 text-sm text-ink-muted">открытых</p>
              </SurfaceCard>
            </Link>
            <Link href="/notifications">
              <SurfaceCard className="transition hover:border-copper/40">
                <p className="text-xs uppercase tracking-wide text-ink-muted">
                  Уведомления
                </p>
                <p className="mt-2 text-3xl font-semibold tabular-nums text-ink">
                  {data.unreadNotifications}
                </p>
                <p className="mt-1 text-sm text-ink-muted">непрочитанных</p>
              </SurfaceCard>
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
