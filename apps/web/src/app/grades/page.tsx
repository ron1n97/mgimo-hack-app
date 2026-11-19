"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ApiError, fetchGradesOverview, type GradesOverview } from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";

export default function GradesPage() {
  const [data, setData] = useState<GradesOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchGradesOverview());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось загрузить учёбу");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const grades = data?.grades ?? [];
  const debts = data?.debts ?? [];
  const tasks = data?.openTasks ?? [];

  return (
    <div className="animate-rise space-y-6">
      <header>
        <h1 className="font-serif text-3xl text-ink">Учёба</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Оценки и зачёты отдельно от заданий преподавателя (ADR 0019).
        </p>
        {data ? (
          <p className="mt-2 text-xs text-ink-muted">
            Оценок: {data.summary.gradeCount} · долгов: {data.summary.debtCount} ·
            заданий: {data.summary.openTaskCount}
          </p>
        ) : null}
      </header>

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} onRetry={load} /> : null}

      {!loading && !error ? (
        <>
          {debts.length > 0 ? (
            <section className="space-y-2">
              <h2 className="font-serif text-xl text-ink">Долги</h2>
              <ul className="divide-y divide-copper/20 overflow-hidden rounded-2xl border border-copper/30 bg-copper/5">
                {debts.map((item) => (
                  <li
                    key={`debt-${item.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3.5"
                  >
                    <div>
                      <p className="font-medium text-ink">{item.subject}</p>
                      <p className="text-xs text-ink-muted">
                        {item.date}
                        {item.kind ? ` · ${item.kind}` : ""}
                      </p>
                    </div>
                    <span className="font-serif text-2xl text-copper">{item.value}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="space-y-2">
            <h2 className="font-serif text-xl text-ink">Оценки и зачёты</h2>
            {grades.length === 0 ? (
              <EmptyState
                title="Пока нет оценок"
                description="Когда появятся результаты — они отобразятся здесь."
              />
            ) : (
              <ul className="divide-y divide-cream-deep overflow-hidden rounded-2xl border border-cream-deep bg-white/50">
                {grades.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 px-4 py-3.5"
                  >
                    <div>
                      <p className="font-medium text-ink">{item.subject}</p>
                      <p className="text-xs text-ink-muted">
                        {item.date}
                        {item.kind ? ` · ${item.kind}` : ""}
                        {item.isDebt ? " · долг" : ""}
                      </p>
                    </div>
                    <span className="min-w-[2.5rem] text-right font-serif text-2xl text-copper">
                      {item.value}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-serif text-xl text-ink">Задания преподавателя</h2>
              <Link
                href="/tasks"
                className="text-xs text-copper underline-offset-2 hover:underline"
              >
                Все задания →
              </Link>
            </div>
            {tasks.length === 0 ? (
              <p className="text-sm text-ink-muted">Открытых заданий нет.</p>
            ) : (
              <ul className="divide-y divide-cream-deep overflow-hidden rounded-2xl border border-cream-deep bg-white/50">
                {tasks.map((item) => (
                  <li key={item.id} className="px-4 py-3.5">
                    <p className="font-medium text-ink">{item.title}</p>
                    <p className="mt-1 text-xs text-ink-muted">
                      {item.assignment?.discipline ?? item.assignment?.groupLabel ?? ""}
                      {item.dueAt
                        ? ` · до ${new Date(item.dueAt).toLocaleDateString("ru-RU")}`
                        : ""}
                    </p>
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
