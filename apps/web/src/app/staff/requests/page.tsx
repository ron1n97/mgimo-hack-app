"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ApiError,
  fetchStaffRequests,
  isMeoServiceRequest,
  updateRequestStatus,
} from "@/lib/api";
import { getUser } from "@/lib/auth";
import type { RequestStatus, ServiceRequest } from "@/lib/types";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";

type TabId = "new" | "active" | "rejected";

const TABS: { id: TabId; label: string }[] = [
  { id: "new", label: "Новые" },
  { id: "active", label: "В работе" },
  { id: "rejected", label: "Отклонены" },
];

function tabForStatus(status: RequestStatus): TabId {
  if (status === "rejected") return "rejected";
  if (status === "submitted" || status === "draft") return "new";
  return "active"; // in_review + approved
}

function statusLabel(status: RequestStatus): string {
  switch (status) {
    case "submitted":
    case "draft":
      return "Новая";
    case "in_review":
      return "В работе";
    case "approved":
      return "Одобрена";
    case "rejected":
      return "Отклонена";
    default:
      return status;
  }
}

export default function StaffRequestsPage() {
  const router = useRouter();
  const [items, setItems] = useState<ServiceRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("new");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStaffRequests();
      const rows = Array.isArray(data) ? data : [];
      setItems(rows.filter(isMeoServiceRequest));
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

  const counts = useMemo(() => {
    const c = { new: 0, active: 0, rejected: 0 };
    for (const item of items) c[tabForStatus(item.status)] += 1;
    return c;
  }, [items]);

  const visible = useMemo(
    () => items.filter((item) => tabForStatus(item.status) === tab),
    [items, tab],
  );

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
      <div
        className="flex gap-1 rounded-xl border border-cream-deep bg-white/50 p-1"
        role="tablist"
        aria-label="Разделы заявок"
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active ? "bg-ink text-cream" : "text-ink-muted hover:text-ink"
              }`}
            >
              {t.label}
              <span className={`ml-1.5 tabular-nums ${active ? "text-cream/70" : "text-ink-muted/70"}`}>
                {counts[t.id]}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} onRetry={load} /> : null}

      {!loading && !error ? (
        visible.length === 0 ? (
          <EmptyState
            title={
              tab === "new"
                ? "Новых заявок нет"
                : tab === "active"
                  ? "В работе пусто"
                  : "Отклонённых нет"
            }
            description="Когда появятся — они окажутся в этом разделе."
          />
        ) : (
          <ul className="space-y-3">
            {visible.map((item) => (
              <li
                key={item.id}
                className="rounded-2xl border border-cream-deep bg-white/50 px-4 py-4"
              >
                <div className="space-y-1">
                  {item.studentName ? (
                    <p className="text-xs text-ink-muted">{item.studentName}</p>
                  ) : null}
                  <h2 className="font-medium text-ink">{item.subject}</h2>
                  <p className="text-sm text-ink-muted">{item.type}</p>
                  <p className="mt-2 text-sm text-ink">{item.body}</p>
                  {tab === "active" && item.status === "approved" ? (
                    <p className="pt-1 text-xs text-emerald-900/80">{statusLabel(item.status)}</p>
                  ) : null}
                </div>
                {tab !== "rejected" ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {tab === "new" ? (
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => setStatus(item.id, "in_review")}
                        className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-medium text-ink hover:bg-cream-deep/50 disabled:opacity-50"
                      >
                        В работу
                      </button>
                    ) : null}
                    {item.status !== "approved" ? (
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => setStatus(item.id, "approved")}
                        className="rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-cream hover:bg-ink/90 disabled:opacity-50"
                      >
                        Одобрить
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => setStatus(item.id, "rejected")}
                      className="rounded-lg border border-copper/40 px-3 py-1.5 text-xs font-medium text-copper hover:bg-copper/10 disabled:opacity-50"
                    >
                      Отклонить
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
