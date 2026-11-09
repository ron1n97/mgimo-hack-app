"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ApiError, fetchMe, fetchSchedule } from "@/lib/api";
import type { ScheduleItem } from "@/lib/types";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";

export default function SchedulePage() {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [groupName, setGroupName] = useState<string | undefined>();
  const [groupRuzId, setGroupRuzId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await fetchMe();
      setGroupName(me.groupName);
      setGroupRuzId(me.groupRuzId);
      const data = await fetchSchedule();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось загрузить расписание");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const noGroup = !groupRuzId && (!groupName || groupName === "Без группы");

  return (
    <div className="animate-rise space-y-6">
      <header>
        <h1 className="font-serif text-3xl text-ink">Расписание</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {noGroup
            ? "Выберите учебную группу в профиле — появятся пары на неделю."
            : `Группа ${groupName} · текущая неделя`}
        </p>
      </header>

      {noGroup ? (
        <div className="rounded-2xl border border-copper/30 bg-copper/5 px-4 py-4">
          <p className="text-sm text-ink">
            Группа ещё не выбрана. Без неё расписание пустое.
          </p>
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
                : "Возможно, выходные или каникулы — загляните в другой период позже."
            }
          />
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={item.id}
                className="rounded-2xl border border-cream-deep bg-white/50 px-4 py-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-copper">
                      {item.startTime}–{item.endTime}
                    </p>
                    <h2 className="mt-1 font-serif text-lg text-ink">{item.title}</h2>
                    <p className="mt-1 text-sm text-ink-muted">
                      {[item.room, item.teacher, item.type].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
