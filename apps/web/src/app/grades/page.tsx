"use client";

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

  return (
    <div className="animate-rise space-y-6">

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} onRetry={load} /> : null}

      {!loading && !error ? (
        <>
          {debts.length > 0 ? (
            <section className="space-y-2">
              <h2 className="text-lg font-semibold tracking-tight text-ink">Долги</h2>
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
                        {item.lessonHint ? ` · ${item.lessonHint}` : ""}
                      </p>
                    </div>
                    <span className="text-2 font-semiboldxl text-copper">{item.value}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="space-y-2">
            <h2 className="text-lg font-semibold tracking-tight text-ink">Оценки и зачёты</h2>
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
                        {item.lessonHint ? ` · ${item.lessonHint}` : ""}
                      </p>
                    </div>
                    <span className="min-w-[2.5rem] text-right text-2 font-semiboldxl text-copper">
                      {item.value}
                    </span>
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
