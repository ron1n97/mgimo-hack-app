"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, createDemoNotification, fetchNotifications } from "@/lib/api";
import type { NotificationItem } from "@/lib/types";
import { enableWebPush, pushSupported } from "@/lib/push";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pushNote, setPushNote] = useState<string | null>(null);
  const [pushBusy, setPushBusy] = useState(false);

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

  async function onEnablePush() {
    setPushBusy(true);
    setPushNote(null);
    const result = await enableWebPush();
    setPushBusy(false);
    if (result.ok) {
      setPushNote("Пуш сохранён для этого устройства.");
      return;
    }
    setPushNote(
      result.reason === "no_vapid"
        ? "VAPID не настроен на сервере."
        : result.reason === "denied"
          ? "Разрешение отклонено."
          : "Не удалось включить пуш.",
    );
  }

  async function onDemoGrade() {
    setPushBusy(true);
    setPushNote(null);
    try {
      await createDemoNotification({
        title: "Демо: новая оценка",
        body: "Международное право — зачёт (тест Web Push).",
        kind: "grade_posted",
      });
      setPushNote("Создали grade_posted — проверьте системное уведомление и ленту.");
      await load();
    } catch {
      setPushNote("Не удалось создать уведомление.");
    } finally {
      setPushBusy(false);
    }
  }

  return (
    <div className="animate-rise space-y-6">
      <header>
        <h1 className="font-serif text-3xl text-ink">Уведомления</h1>
        <p className="mt-1 text-sm text-ink-muted">Переносы, статусы заявок, напоминания.</p>
      </header>

      {pushSupported() ? (
        <div className="rounded-2xl border border-cream-deep bg-white/50 px-4 py-3">
          <p className="text-sm text-ink">Пуш на телефон (PWA / Android Chrome)</p>
          <p className="mt-1 text-xs text-ink-muted">
            Установите на домашний экран, разрешите уведомления — оценки и дайджест придут даже
            когда вкладка закрыта.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pushBusy}
              onClick={() => void onEnablePush()}
              className="rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-cream disabled:opacity-60"
            >
              Включить пуш
            </button>
            <button
              type="button"
              disabled={pushBusy}
              onClick={() => void onDemoGrade()}
              className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs text-ink-muted disabled:opacity-60"
            >
              Тест grade_posted
            </button>
          </div>
          {pushNote ? <p className="mt-2 text-xs text-copper">{pushNote}</p> : null}
        </div>
      ) : null}

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
