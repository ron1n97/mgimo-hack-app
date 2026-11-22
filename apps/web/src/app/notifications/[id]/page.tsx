"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  fetchNotification,
  markNotificationRead,
} from "@/lib/api";
import {
  formatNotificationWhen,
  notificationKindLabel,
} from "@/lib/notification-kind";
import type { NotificationItem } from "@/lib/types";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";

export default function NotificationCardPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : "";
  const [item, setItem] = useState<NotificationItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const row = await fetchNotification(id);
      setItem(row);
      if (!row.read) {
        const marked = await markNotificationRead(id);
        setItem(marked);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не найдено");
      setItem(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="animate-rise mx-auto max-w-lg space-y-4">
      <button
        type="button"
        onClick={() => router.push("/notifications")}
        className="text-sm text-copper underline-offset-2 hover:underline"
      >
        ← К ленте
      </button>

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

      {!loading && !error && item ? (
        <article className="rounded-2xl border border-cream-deep bg-white/70 px-5 py-5 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wide text-copper">
            {notificationKindLabel(item.kind)}
            {item.read ? " · просмотрено" : ""}
          </p>
          <h1 className="mt-2 font-serif text-2xl text-ink">{item.title}</h1>
          <p className="mt-1 text-xs text-ink-muted">
            {formatNotificationWhen(item.createdAt)}
          </p>
          <div className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-ink">
            {item.body}
          </div>
          {item.kind?.startsWith("digest_") ? (
            <Link
              href="/clubs"
              className="mt-6 inline-block text-sm font-medium text-copper underline-offset-2 hover:underline"
            >
              Открыть дайджест →
            </Link>
          ) : null}
          {item.kind?.startsWith("request_") ? (
            <Link
              href="/requests"
              className="mt-6 inline-block text-sm font-medium text-copper underline-offset-2 hover:underline"
            >
              К заявкам →
            </Link>
          ) : null}
          {item.kind?.startsWith("grade_") || item.kind === "academic_debt" ? (
            <Link
              href="/grades"
              className="mt-6 inline-block text-sm font-medium text-copper underline-offset-2 hover:underline"
            >
              К учёбе →
            </Link>
          ) : null}
        </article>
      ) : null}
    </div>
  );
}
