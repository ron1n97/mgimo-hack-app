"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, fetchStudentTasks } from "@/lib/api";
import { getUser } from "@/lib/auth";
import type { LessonTaskItem } from "@/lib/types";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";

function formatDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
}

export default function StudentTasksPage() {
  const router = useRouter();
  const [items, setItems] = useState<LessonTaskItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStudentTasks();
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
    if (!user || user.role !== "student") {
      router.replace(
        user?.role === "teacher"
          ? "/teacher"
          : user?.role === "staff" || user?.role === "admin"
            ? "/staff/requests"
            : "/",
      );
      return;
    }
    void load();
  }, [load, router]);

  return (
    <div className="animate-rise space-y-6">
      <header>
        <h1 className="font-serif text-3xl text-ink">Задания</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Домашние задания от преподавателей вашей группы.
        </p>
      </header>

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} onRetry={load} /> : null}

      {!loading && !error ? (
        items.length === 0 ? (
          <EmptyState
            title="Пока нет заданий"
            description="Когда преподаватель прикрепит задание к паре — оно появится здесь."
          />
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={item.id}
                className="rounded-2xl border border-cream-deep bg-white/50 px-4 py-4"
              >
                <p className="text-xs text-copper">
                  {item.assignment?.discipline ?? "Задание"}
                  {item.assignment?.groupLabel
                    ? ` · ${item.assignment.groupLabel}`
                    : ""}
                </p>
                <h2 className="mt-1 font-medium text-ink">{item.title}</h2>
                <p className="mt-2 text-sm text-ink">{item.body}</p>
                <p className="mt-3 text-xs text-ink-muted">
                  {item.createdBy?.teacherProfile?.fullName
                    ? `${item.createdBy.teacherProfile.fullName} · `
                    : ""}
                  {item.dueAt
                    ? `до ${formatDate(item.dueAt)}`
                    : `создано ${formatDate(item.createdAt)}`}
                </p>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
