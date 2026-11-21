"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ApiError, fetchRequests } from "@/lib/api";
import type { ServiceRequest } from "@/lib/types";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { StatusBadge } from "@/components/StatusBadge";

export default function RequestsPage() {
  const [items, setItems] = useState<ServiceRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRequests();
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
      <div className="flex justify-end">
        <Link
          href="/requests/new"
          className="shrink-0 rounded-xl bg-copper px-3.5 py-2 text-sm font-semibold text-cream hover:bg-copper-dark"
        >
          Новая
        </Link>
      </div>

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} onRetry={load} /> : null}

      {!loading && !error ? (
        items.length === 0 ? (
          <EmptyState
            title="Заявок нет"
            description="Создайте первую — можно набросать текст с помощью ИИ."
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
                    <p className="text-xs text-ink-muted">{item.type}</p>
                    <h2 className="mt-0.5 font-medium text-ink">{item.subject}</h2>
                    <p className="mt-2 line-clamp-2 text-sm text-ink-muted">{item.body}</p>
                    <p className="mt-2 text-xs text-ink-muted">{item.createdAt}</p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
