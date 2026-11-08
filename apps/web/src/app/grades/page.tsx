"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, fetchGrades } from "@/lib/api";
import type { GradeItem } from "@/lib/types";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";

export default function GradesPage() {
  const [items, setItems] = useState<GradeItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchGrades();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка загрузки");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="animate-rise space-y-6">
      <header>
        <h1 className="font-serif text-3xl text-ink">Учёба</h1>
        <p className="mt-1 text-sm text-ink-muted">Оценки и контрольные точки.</p>
      </header>

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} onRetry={load} /> : null}

      {!loading && !error ? (
        items.length === 0 ? (
          <EmptyState title="Оценок пока нет" description="Демо-данные появятся после seed API." />
        ) : (
          <ul className="divide-y divide-cream-deep overflow-hidden rounded-2xl border border-cream-deep bg-white/50">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
                <div>
                  <p className="font-medium text-ink">{item.subject}</p>
                  <p className="text-xs text-ink-muted">
                    {item.date}
                    {item.kind ? ` · ${item.kind}` : ""}
                  </p>
                </div>
                <span className="min-w-[2.5rem] text-right font-serif text-2xl text-copper">
                  {item.value}
                </span>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
