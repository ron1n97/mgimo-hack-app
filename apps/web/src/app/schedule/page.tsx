"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, fetchMe, fetchSchedule } from "@/lib/api";
import type { ScheduleItem, UserRole } from "@/lib/types";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";

const DOW = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"] as const;

function localIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Calendar «today» in Europe/Moscow — schedule SoT is MSK. */
function mskNow(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const d = Number(parts.find((p) => p.type === "day")?.value);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function mondayOf(d = mskNow()): Date {
  const x = new Date(d);
  const day = x.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + offset);
  x.setHours(12, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export default function SchedulePage() {
  const [weekStart, setWeekStart] = useState(() => mondayOf());
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [groupName, setGroupName] = useState<string | undefined>();
  const [groupRuzId, setGroupRuzId] = useState<string | undefined>();
  const [role, setRole] = useState<UserRole>("student");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [scrollTodayToken, setScrollTodayToken] = useState(0);

  const from = localIso(weekStart);
  const to = localIso(addDays(weekStart, 6));
  const todayIso = localIso(mskNow());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await fetchMe();
      setRole(me.role);
      setGroupName(me.groupName);
      setGroupRuzId(me.groupRuzId);
      const data = await fetchSchedule(from, to);
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось загрузить расписание");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!scrollTodayToken || loading) return;
    const id = `schedule-day-${todayIso}`;
    const t = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }, 50);
    return () => window.clearTimeout(t);
  }, [scrollTodayToken, loading, todayIso, weekStart]);

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      const iso = localIso(date);
      const dayItems = items
        .filter((it) => it.date === iso)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
      return { date, iso, label: DOW[i], items: dayItems };
    });
  }, [items, weekStart]);

  const noGroup = !groupRuzId && (!groupName || groupName === "Без группы");
  const isStaffView = role === "admin" || role === "staff";
  const pickGroupHint = isStaffView
    ? "Выберите группу для просмотра в профиле — появится календарь."
    : "Группу задаёт деканат в карточке студента — без неё календарь пуст.";
  const pickGroupCta = isStaffView
    ? "Выбрать группу для просмотра →"
    : "Открыть профиль →";

  return (
    <div className="animate-rise space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl text-ink">Расписание</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {noGroup
              ? pickGroupHint
              : `${isStaffView ? "Просмотр" : "Группа"} ${groupName} · неделя ${from.slice(5)} — ${to.slice(5)}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setWeekStart((w) => addDays(w, -7))}
            className="rounded-lg border border-ink/15 px-3 py-1.5 text-sm text-ink-muted hover:border-ink/30 hover:text-ink"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => {
              setWeekStart(mondayOf(mskNow()));
              setScrollTodayToken((n) => n + 1);
            }}
            className="rounded-lg border border-ink/15 px-3 py-1.5 text-sm text-ink-muted hover:border-ink/30 hover:text-ink"
          >
            Сегодня
          </button>
          <button
            type="button"
            onClick={() => setWeekStart((w) => addDays(w, 7))}
            className="rounded-lg border border-ink/15 px-3 py-1.5 text-sm text-ink-muted hover:border-ink/30 hover:text-ink"
          >
            →
          </button>
        </div>
      </header>

      {noGroup ? (
        <div className="rounded-2xl border border-copper/30 bg-copper/5 px-4 py-4">
          <p className="text-sm text-ink">
            {isStaffView
              ? "Группа для просмотра ещё не выбрана."
              : "Группа ещё не привязана деканатом."}
          </p>
          <Link
            href="/profile"
            className="mt-3 inline-block text-sm font-semibold text-copper underline-offset-4 hover:underline"
          >
            {pickGroupCta}
          </Link>
        </div>
      ) : null}

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} onRetry={load} /> : null}

      {!loading && !error ? (
        items.length === 0 ? (
          <EmptyState
            title="На этой неделе пар нет"
            description={
              noGroup
                ? isStaffView
                  ? "Укажите группу для просмотра в профиле."
                  : "Укажите группу в профиле."
                : "Листайте стрелками на соседние недели."
            }
          />
        ) : (
          <div className="overflow-x-auto pb-2">
            <div className="grid min-w-[720px] grid-cols-7 gap-2">
              {days.map((day) => {
                const isToday = day.iso === todayIso;
                return (
                  <div
                    key={day.iso}
                    id={`schedule-day-${day.iso}`}
                    className={`min-h-[12rem] rounded-2xl border p-2 ${
                      isToday
                        ? "border-copper/40 bg-copper/5 ring-2 ring-copper/30"
                        : "border-cream-deep bg-white/40"
                    }`}
                  >
                    <div className="mb-2 border-b border-cream-deep/80 pb-1.5">
                      <p className="text-[11px] uppercase tracking-wide text-ink-muted">
                        {day.label}
                      </p>
                      <p className={`text-sm font-medium ${isToday ? "text-copper" : "text-ink"}`}>
                        {day.date.getDate()}
                      </p>
                    </div>
                    <ul className="space-y-1.5">
                      {day.items.length === 0 ? (
                        <li className="px-1 text-[11px] text-ink-muted/70">—</li>
                      ) : (
                        day.items.map((item) => (
                          <li
                            key={item.id}
                            className={`rounded-lg px-1.5 py-1.5 ${
                              item.isMoved || item.isCancelled
                                ? "bg-copper/15 ring-1 ring-copper/35"
                                : "bg-cream/80"
                            }`}
                          >
                            <p className="text-[10px] font-semibold text-copper">
                              {item.startTime}–{item.endTime}
                              {item.isCancelled
                                ? " · отмена"
                                : item.isMoved
                                  ? " · перенос"
                                  : ""}
                            </p>
                            <p className="mt-0.5 text-[11px] font-medium leading-snug text-ink">
                              {item.title}
                            </p>
                            {item.subGroup ? (
                              <p className="mt-0.5 text-[10px] font-medium text-copper-dark">
                                {item.subGroup}
                              </p>
                            ) : null}
                            <p className="mt-0.5 text-[10px] leading-snug text-ink-muted">
                              {[item.room, item.teacher].filter(Boolean).join(" · ")}
                            </p>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        )
      ) : null}
    </div>
  );
}
