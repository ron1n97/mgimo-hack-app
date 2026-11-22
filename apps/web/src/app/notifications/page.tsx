"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { ApiError, createDemoNotification, fetchNotifications } from "@/lib/api";
import {
  formatNotificationWhen,
  notificationKindLabel,
} from "@/lib/notification-kind";
import type { NotificationItem } from "@/lib/types";
import { enableWebPush, pushSupported } from "@/lib/push";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";

function NotificationsList() {
  const router = useRouter();
  const searchParams = useSearchParams();
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

  // Deep links from push / widgets: ?id= / ?focus=
  useEffect(() => {
    const deep =
      searchParams.get("id") || searchParams.get("focus") || "";
    if (deep) {
      router.replace(`/notifications/${encodeURIComponent(deep)}`);
    }
  }, [router, searchParams]);

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
          : result.reason === "unsupported"
            ? "На этом браузере Web Push недоступен (нужен Chrome/PWA на Android или установленное PWA)."
            : "Не удалось включить пуш.",
    );
  }

  async function onDemoPush() {
    setPushBusy(true);
    setPushNote(null);
    try {
      await createDemoNotification({
        title: "Демо: объявление деканата",
        body: "Проверка пуша и карточки уведомления. Откройте это сообщение — оно отметится просмотренным.",
        kind: "deanery_announce",
      });
      setPushNote("Создали уведомление — проверьте системный пуш и откройте карточку в ленте.");
      await load();
    } catch {
      setPushNote("Не удалось создать уведомление.");
    } finally {
      setPushBusy(false);
    }
  }

  return (
    <div className="animate-rise space-y-6">
      {pushSupported() ? (
        <div className="rounded-2xl border border-cream-deep bg-white/50 px-4 py-3">
          <p className="text-sm text-ink">Пуш на телефон</p>
          <p className="mt-1 text-xs text-ink-muted">
            Android Chrome / установленное PWA: разрешите уведомления. iOS — только после «На экран
            Домой».
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
              onClick={() => void onDemoPush()}
              className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs text-ink-muted disabled:opacity-60"
            >
              Тест пуша
            </button>
          </div>
          {pushNote ? <p className="mt-2 text-xs text-copper">{pushNote}</p> : null}
        </div>
      ) : (
        <p className="text-xs text-ink-muted">
          Web Push на этом устройстве недоступен. На iPhone установите PWA на домашний экран.
        </p>
      )}

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} onRetry={load} /> : null}

      {!loading && !error ? (
        items.length === 0 ? (
          <EmptyState title="Тишина" description="Новых уведомлений нет." />
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/notifications/${item.id}`}
                  className={`block rounded-2xl border px-4 py-4 transition ${
                    item.read
                      ? "border-cream-deep bg-white/70 hover:border-copper/30"
                      : "border-copper/40 bg-ink text-cream ring-1 ring-copper/30 hover:bg-ink/95"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!item.read ? (
                      <span
                        className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-copper"
                        aria-hidden
                      />
                    ) : (
                      <span className="mt-1.5 h-2.5 w-2.5 shrink-0" aria-hidden />
                    )}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-[10px] uppercase tracking-wide ${
                          item.read ? "text-copper" : "text-copper/90"
                        }`}
                      >
                        {notificationKindLabel(item.kind)}
                      </p>
                      <h2
                        className={`mt-0.5 font-medium ${item.read ? "text-ink" : "text-cream"}`}
                      >
                        {item.title}
                      </h2>
                      <p
                        className={`mt-1 line-clamp-2 text-sm ${
                          item.read ? "text-ink-muted" : "text-cream/80"
                        }`}
                      >
                        {item.body}
                      </p>
                      <p
                        className={`mt-2 text-xs ${item.read ? "text-ink-muted" : "text-cream/55"}`}
                      >
                        {formatNotificationWhen(item.createdAt)}
                        {!item.read ? " · новое" : ""}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <NotificationsList />
    </Suspense>
  );
}
