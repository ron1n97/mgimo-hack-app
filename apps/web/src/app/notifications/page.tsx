"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, fetchNotifications } from "@/lib/api";
import type { NotificationItem } from "@/lib/types";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchNotifications();
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
        <h1 className="font-serif text-3xl text-ink">Уведомления</h1>
        <p className="mt-1 text-sm text-ink-muted">Переносы, статусы заявок, напоминания.</p>
      </header>

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} onRetry={load} /> : null}

      {!loading && !error ? (
        items.length === 0 ? (
          <EmptyState title="Тишина" description="Новых уведомлений нет." />
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li
                key={item.id}
                className={`rounded-2xl border px-4 py-4 ${
                  item.read
                    ? "border-cream-deep bg-white/30"
                    : "border-copper/25 bg-white/60"
                }`}
              >
                <div className="flex items-start gap-2">
                  {!item.read ? (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-copper" aria-hidden />
                  ) : (
                    <span className="mt-1.5 h-2 w-2 shrink-0" aria-hidden />
                  )}
                  <div>
                    <h2 className="font-medium text-ink">{item.title}</h2>
                    <p className="mt-1 text-sm text-ink-muted">{item.body}</p>
                    <p className="mt-2 text-xs text-ink-muted">{item.createdAt}</p>
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
