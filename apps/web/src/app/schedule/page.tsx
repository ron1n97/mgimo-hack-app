"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, fetchMe, fetchSchedule } from "@/lib/api";
import type { ScheduleItem, UserRole } from "@/lib/types";
import { PageHeader } from "@/components/campus";
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

function lessonFlag(item: ScheduleItem): string {
  if (item.isCancelled) return " · отмена";
  if (item.isMoved) return " · перенос";
  return "";
}

function LessonCard({
  item,
  dense = false,
}: {
  item: ScheduleItem;
  dense?: boolean;
}) {
  const flagged = item.isMoved || item.isCancelled;
  return (
    <li
      className={`min-w-0 overflow-hidden rounded-lg ${
        dense ? "px-1.5 py-1.5" : "px-3 py-2.5"
      } ${
        flagged
          ? "bg-copper/15 ring-1 ring-copper/35"
          : dense
            ? "bg-cream/80"
            : "border border-cream-deep bg-cream/60"
      }`}
    >
      <p
        className={`font-semibold text-copper ${
          dense ? "text-[10px]" : "text-xs"
        }`}
      >
        {item.startTime}–{item.endTime}
        {lessonFlag(item)}
      </p>
      <p
        className={`mt-0.5 min-w-0 break-words font-medium leading-snug text-ink ${
          dense ? "text-[11px]" : "text-sm"
        }`}
      >
        {item.title}
      </p>
      {item.subGroup ? (
        <p
          className={`mt-0.5 min-w-0 break-words font-medium text-copper-dark ${
            dense ? "text-[10px]" : "text-xs"
          }`}
        >
          {item.subGroup}
        </p>
      ) : null}
      <p
        className={`mt-0.5 min-w-0 break-words leading-snug text-ink-muted ${
          dense ? "text-[10px]" : "text-xs"
        }`}
      >
        {[item.room, item.teacher].filter(Boolean).join(" · ")}
      </p>
    </li>
  );
}

type DayColumn = {
  date: Date;
  iso: string;
  label: string;
  items: ScheduleItem[];
};

function DayHeader({
  day,
  isToday,
  size = "md",
}: {
  day: DayColumn;
  isToday: boolean;
  size?: "sm" | "md";
}) {
  return (
    <div
      className={
        size === "sm"
          ? "mb-2 border-b border-cream-deep/80 pb-1.5"
          : "mb-3 flex items-baseline justify-between gap-2 border-b border-cream-deep/80 pb-2"
      }
    >
      <div className="min-w-0">
        <p
          className={`uppercase tracking-wide text-ink-muted ${
            size === "sm" ? "text-[11px]" : "text-xs"
          }`}
        >
          {day.label}
        </p>
        <p
          className={`font-medium ${isToday ? "text-copper" : "text-ink"} ${
            size === "sm" ? "text-sm" : "text-base"
          }`}
        >
          {day.date.getDate()}
          {size === "md" ? (
            <span className="ml-1.5 text-sm font-normal text-ink-muted">
              {day.iso.slice(5).replace("-", ".")}
            </span>
          ) : null}
        </p>
      </div>
      {isToday && size === "md" ? (
        <span className="shrink-0 rounded-full bg-copper/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-copper">
          сегодня
        </span>
      ) : null}
    </div>
  );
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
    const t = window.setTimeout(() => {
      const mobile = window.matchMedia("(max-width: 767px)").matches;
      const el = document.getElementById(
        mobile
          ? `schedule-day-${todayIso}`
          : `schedule-day-desk-${todayIso}`,
      );
      el?.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }, 50);
    return () => window.clearTimeout(t);
  }, [scrollTodayToken, loading, todayIso, weekStart]);

  const days = useMemo((): DayColumn[] => {
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
      <PageHeader title="Пары" />
      <header className="flex flex-wrap items-end justify-between gap-3">
        <p className="min-w-0 flex-1 break-words text-sm text-ink-muted">
          {noGroup
            ? pickGroupHint
            : `${isStaffView ? "Просмотр" : "Группа"} ${groupName} · неделя ${from.slice(5)} — ${to.slice(5)}`}
        </p>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setWeekStart((w) => addDays(w, -7))}
            className="rounded-lg border border-cream-deep bg-white px-3 py-1.5 text-sm text-ink-muted hover:border-copper/40 hover:text-ink"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => {
              setWeekStart(mondayOf(mskNow()));
              setScrollTodayToken((n) => n + 1);
            }}
            className="rounded-lg border border-cream-deep bg-white px-3 py-1.5 text-sm font-medium text-ink hover:border-copper/40"
          >
            Сегодня
          </button>
          <button
            type="button"
            onClick={() => setWeekStart((w) => addDays(w, 7))}
            className="rounded-lg border border-cream-deep bg-white px-3 py-1.5 text-sm text-ink-muted hover:border-copper/40 hover:text-ink"
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
          <>
            {/* Mobile: stacked days — full width, no horizontal squeeze */}
            <div className="space-y-4 md:hidden">
              {days.map((day) => {
                const isToday = day.iso === todayIso;
                return (
                  <section
                    key={day.iso}
                    id={`schedule-day-${day.iso}`}
                    className={`min-w-0 overflow-hidden rounded-2xl border p-3 ${
                      isToday
                        ? "border-copper/40 bg-copper/5 ring-2 ring-copper/30"
                        : "border-cream-deep bg-white/40"
                    }`}
                  >
                    <DayHeader day={day} isToday={isToday} size="md" />
                    <ul className="space-y-2">
                      {day.items.length === 0 ? (
                        <li className="px-1 text-xs text-ink-muted/70">Пар нет</li>
                      ) : (
                        day.items.map((item) => (
                          <LessonCard key={item.id} item={item} />
                        ))
                      )}
                    </ul>
                  </section>
                );
              })}
            </div>

            {/* Desktop / tablet: week grid */}
            <div className="hidden overflow-x-auto pb-2 md:block">
              <div className="grid min-w-[720px] grid-cols-7 gap-2">
                {days.map((day) => {
                  const isToday = day.iso === todayIso;
                  return (
                    <div
                      key={day.iso}
                      id={`schedule-day-desk-${day.iso}`}
                      className={`min-h-[12rem] min-w-0 overflow-hidden rounded-2xl border p-2 ${
                        isToday
                          ? "border-copper/40 bg-copper/5 ring-2 ring-copper/30"
                          : "border-cream-deep bg-white/40"
                      }`}
                    >
                      <DayHeader day={day} isToday={isToday} size="sm" />
                      <ul className="space-y-1.5">
                        {day.items.length === 0 ? (
                          <li className="px-1 text-[11px] text-ink-muted/70">—</li>
                        ) : (
                          day.items.map((item) => (
                            <LessonCard key={item.id} item={item} dense />
                          ))
                        )}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )
      ) : null}
    </div>
  );
}
