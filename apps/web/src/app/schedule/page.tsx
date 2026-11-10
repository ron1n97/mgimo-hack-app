"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, fetchMe, fetchSchedule } from "@/lib/api";
import type { ScheduleItem } from "@/lib/types";
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

function mondayOf(d = new Date()): Date {
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
  const [hasSubPreference, setHasSubPreference] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const from = localIso(weekStart);
  const to = localIso(addDays(weekStart, 6));
  const todayIso = localIso(new Date());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await fetchMe();
      setGroupName(me.groupName);
      setGroupRuzId(me.groupRuzId);
      setHasSubPreference((me.preferredSubGroupOids?.length ?? 0) > 0);
      const data = await fetchSchedule(from, to, { showAll });
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось загрузить расписание");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [from, to, showAll]);

  useEffect(() => {
    void load();
  }, [load]);

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

  return (
    <div className="animate-rise space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl text-ink">Расписание</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {noGroup
              ? "Выберите группу в профиле — появится календарь."
              : `Группа ${groupName} · неделя ${from.slice(5)} — ${to.slice(5)}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasSubPreference ? (
            <label className="flex items-center gap-2 rounded-lg border border-ink/15 px-3 py-1.5 text-sm text-ink-muted">
              <input
                type="checkbox"
                checked={showAll}
                onChange={(e) => setShowAll(e.target.checked)}
              />
              Все подгруппы
            </label>
          ) : null}
          <button
            type="button"
            onClick={() => setWeekStart((w) => addDays(w, -7))}
            className="rounded-lg border border-ink/15 px-3 py-1.5 text-sm text-ink-muted hover:border-ink/30 hover:text-ink"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(mondayOf())}
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
          <p className="text-sm text-ink">Группа ещё не выбрана.</p>
          <Link
            href="/profile"
            className="mt-3 inline-block text-sm font-semibold text-copper underline-offset-4 hover:underline"
          >
            Выбрать группу →
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
                ? "Укажите группу в профиле."
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
                    className={`min-h-[12rem] rounded-2xl border p-2 ${
                      isToday
                        ? "border-copper/40 bg-copper/5"
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
                            className="rounded-lg bg-cream/80 px-1.5 py-1.5"
                          >
                            <p className="text-[10px] font-semibold text-copper">
                              {item.startTime}–{item.endTime}
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
