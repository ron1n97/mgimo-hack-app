"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, fetchStaffRequests, updateRequestStatus } from "@/lib/api";
import { getUser } from "@/lib/auth";
import type { ServiceRequest } from "@/lib/types";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { StatusBadge } from "@/components/StatusBadge";

export default function StaffRequestsPage() {
  const router = useRouter();
  const [items, setItems] = useState<ServiceRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStaffRequests();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка загрузки");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const user = getUser();
    if (user && user.role !== "staff" && user.role !== "admin") {
      router.replace("/today");
      return;
    }
    void load();
  }, [load, router]);

  async function setStatus(id: string, status: ServiceRequest["status"]) {
    setBusyId(id);
    setError(null);
    try {
      const updated = await updateRequestStatus(id, status);
      setItems((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось обновить статус");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="animate-rise space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-wider text-copper">Кабинет сотрудника</p>
        <h1 className="mt-1 font-serif text-3xl text-ink">Очередь заявок</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Кабинет сотрудника деканата — смена статусов заявок.
        </p>
        <nav className="mt-3 flex flex-wrap gap-3 text-sm">
          <a href="/staff/students" className="text-copper underline-offset-2 hover:underline">
            Студенты
          </a>
          <a href="/staff/announce" className="text-copper underline-offset-2 hover:underline">
            Объявления / переносы
          </a>
          <a href="/staff/clubs" className="text-copper underline-offset-2 hover:underline">
            Клубы
          </a>
          <a href="/staff/teachers" className="text-copper underline-offset-2 hover:underline">
            Преподаватели
          </a>
          <a href="/staff/timetable" className="text-copper underline-offset-2 hover:underline">
            Оптимизатор
          </a>
        </nav>
      </header>

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} onRetry={load} /> : null}

      {!loading && !error ? (
        items.length === 0 ? (
          <EmptyState title="Очередь пуста" description="Новые заявки студентов появятся здесь." />
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={item.id}
                className="rounded-2xl border border-cream-deep bg-white/50 px-4 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    {item.studentName ? (
                      <p className="text-xs text-ink-muted">{item.studentName}</p>
                    ) : null}
                    <h2 className="font-medium text-ink">{item.subject}</h2>
                    <p className="mt-1 text-sm text-ink-muted">{item.type}</p>
                    <p className="mt-2 text-sm text-ink">{item.body}</p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => setStatus(item.id, "in_review")}
                    className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-medium text-ink hover:bg-cream-deep/50 disabled:opacity-50"
                  >
                    В работу
                  </button>
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => setStatus(item.id, "approved")}
                    className="rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-cream hover:bg-ink/90 disabled:opacity-50"
                  >
                    Одобрить
                  </button>
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => setStatus(item.id, "rejected")}
                    className="rounded-lg border border-copper/40 px-3 py-1.5 text-xs font-medium text-copper hover:bg-copper/10 disabled:opacity-50"
                  >
                    Отклонить
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
