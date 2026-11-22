"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, fetchAdminOverview } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchAdminOverview>> | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchAdminOverview());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Нет доступа");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const user = getUser();
    if (user && user.role !== "admin") {
      router.replace(user.role === "staff" ? "/staff" : "/today");
      return;
    }
    void load();
  }, [load, router]);

  return (
    <div className="animate-rise space-y-6">
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} onRetry={load} /> : null}

      {data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {(
              [
                ["Студенты", data.counts.students],
                ["Сотрудники", data.counts.staff],
                ["Преподаватели", data.counts.teachers ?? 0],
                ["Админы", data.counts.admins],
                ["Открытые заявки", data.counts.openTickets],
                ["Долги (оценки)", data.counts.debts],
                ["Пары в базе", data.counts.lessons],
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-cream-deep bg-white/50 px-4 py-4"
              >
                <p className="text-xs uppercase tracking-wide text-ink-muted">{label}</p>
                <p className="mt-2 text-3 font-semiboldxl text-ink">{value}</p>
              </div>
            ))}
          </div>

          <section>
            <h2 className="text-lg font-semibold tracking-tight text-ink">Пользователи</h2>
            <ul className="mt-3 divide-y divide-cream-deep overflow-hidden rounded-2xl border border-cream-deep bg-white/50">
              {data.users.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="font-medium text-ink">{u.name}</p>
                    <p className="text-xs text-ink-muted">
                      {u.email}
                      {u.meta ? ` · ${u.meta}` : ""}
                    </p>
                  </div>
                  <span className="rounded-lg bg-ink/5 px-2 py-1 text-[11px] uppercase tracking-wide text-ink-muted">
                    {u.role}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </div>
  );
}
