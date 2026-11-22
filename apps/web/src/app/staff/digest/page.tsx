"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ApiError,
  fetchStaffDigestEvents,
  ingestTelegramDigest,
  updateStaffDigestEvent,
  type StaffDigestEvent,
} from "@/lib/api";
import { getUser } from "@/lib/auth";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";

type Tab = "PENDING" | "APPROVED" | "REJECTED" | "ALL";

const TABS: { id: Tab; label: string }[] = [
  { id: "PENDING", label: "На проверке" },
  { id: "APPROVED", label: "В дайджесте" },
  { id: "REJECTED", label: "Отклонённые" },
  { id: "ALL", label: "Все" },
];

function toLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  // datetime-local wants local wall time
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  if (!value.trim()) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function statusLabel(s: string): string {
  if (s === "PENDING") return "На проверке";
  if (s === "APPROVED") return "В дайджесте";
  if (s === "REJECTED") return "Отклонено";
  return s;
}

export default function StaffDigestPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("PENDING");
  const [items, setItems] = useState<StaffDigestEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [ingestInfo, setIngestInfo] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<string, { title: string; body: string; startsAt: string }>
  >({});

  const load = useCallback(async (status: Tab) => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchStaffDigestEvents(status);
      setItems(rows);
      const next: typeof drafts = {};
      for (const row of rows) {
        next[row.id] = {
          title: row.title,
          body: row.body ?? "",
          startsAt: toLocalInput(row.startsAt),
        };
      }
      setDrafts(next);
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
    void load(tab);
  }, [load, router, tab]);

  const countsHint = useMemo(() => {
    const n = items.length;
    return n ? `${n}` : "0";
  }, [items.length]);

  async function onIngest(mode: "default" | "weekly" = "default") {
    setBusyId(mode === "weekly" ? "ingest-weekly" : "ingest");
    setError(null);
    setIngestInfo(null);
    try {
      const result = await ingestTelegramDigest(mode);
      setIngestInfo(
        `${mode === "weekly" ? "Недельная стяжка" : "TG"}: ${result.sourcesOk}/${result.sourcesTried} источников, постов ${result.postsUpserted}` +
          (result.errors.length ? `, ошибок ${result.errors.length}` : "") +
          " — новые во вкладке «На проверке».",
      );
      setTab("PENDING");
      await load("PENDING");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось стянуть TG");
    } finally {
      setBusyId(null);
    }
  }

  async function save(
    id: string,
    patch: {
      status?: "PENDING" | "APPROVED" | "REJECTED";
      saveFields?: boolean;
    },
  ) {
    const draft = drafts[id];
    if (!draft) return;
    setBusyId(id);
    setError(null);
    try {
      const updated = await updateStaffDigestEvent(id, {
        ...(patch.saveFields
          ? {
              title: draft.title,
              body: draft.body,
              startsAt: fromLocalInput(draft.startsAt),
            }
          : {}),
        ...(patch.status ? { status: patch.status } : {}),
      });
      setItems((prev) => {
        if (tab !== "ALL" && updated.moderationStatus !== tab) {
          return prev.filter((r) => r.id !== id);
        }
        return prev.map((r) => (r.id === id ? { ...r, ...updated } : r));
      });
      setDrafts((prev) => ({
        ...prev,
        [id]: {
          title: updated.title,
          body: updated.body ?? "",
          startsAt: toLocalInput(updated.startsAt),
        },
      }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось сохранить");
    } finally {
      setBusyId(null);
    }
  }

  function onSaveFields(e: FormEvent, id: string) {
    e.preventDefault();
    void save(id, { saveFields: true });
  }

  return (
    <div className="animate-rise mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          Проверка мероприятий для студенческого дайджеста.{" "}
          <Link href="/staff/clubs" className="text-copper underline-offset-2 hover:underline">
            Клубы и источники
          </Link>
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busyId === "ingest" || busyId === "ingest-weekly"}
            onClick={() => void onIngest("weekly")}
            className="rounded-xl bg-copper px-3.5 py-2 text-sm font-semibold text-cream disabled:opacity-50"
          >
            {busyId === "ingest-weekly"
              ? "Недельная стяжка…"
              : "Недельная стяжка"}
          </button>
          <button
            type="button"
            disabled={busyId === "ingest" || busyId === "ingest-weekly"}
            onClick={() => void onIngest("default")}
            className="rounded-xl border border-ink/15 px-3.5 py-2 text-sm font-medium text-ink disabled:opacity-50"
          >
            {busyId === "ingest" ? "Тянем…" : "Быстрый TG"}
          </button>
        </div>
      </div>
      {ingestInfo ? <p className="text-sm text-ink-muted">{ingestInfo}</p> : null}

      <div
        className="flex gap-1 overflow-x-auto rounded-xl border border-cream-deep bg-white/50 p-1"
        role="tablist"
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
              className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active ? "bg-ink text-cream" : "text-ink-muted hover:text-ink"
              }`}
            >
              {t.label}
              {active ? (
                <span className="ml-1.5 tabular-nums opacity-70">{countsHint}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} onRetry={() => void load(tab)} /> : null}

      {!loading && !error && items.length === 0 ? (
        <EmptyState
          title="Пусто"
          description={
            tab === "PENDING"
              ? "Стяните посты из Telegram — новые окажутся здесь на проверку."
              : "В этой вкладке пока нет записей."
          }
        />
      ) : null}

      {!loading && items.length > 0 ? (
        <ul className="space-y-4">
          {items.map((item) => {
            const draft = drafts[item.id] ?? {
              title: item.title,
              body: item.body ?? "",
              startsAt: "",
            };
            return (
              <li
                key={item.id}
                className="rounded-2xl border border-cream-deep bg-white/60 p-4"
              >
                <form
                  onSubmit={(e) => onSaveFields(e, item.id)}
                  className="space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
                    <span>
                      {item.club?.name ?? "Без клуба"}
                      {item.source?.kind ? ` · ${item.source.kind}` : ""}
                    </span>
                    <span>{statusLabel(item.moderationStatus)}</span>
                  </div>
                  <label className="block text-sm">
                    <span className="text-ink-muted">Название</span>
                    <input
                      required
                      value={draft.title}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [item.id]: { ...draft, title: e.target.value },
                        }))
                      }
                      className="mt-1 w-full rounded-xl border border-cream-deep bg-cream/40 px-3 py-2 outline-none ring-copper/40 focus:ring-2"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-ink-muted">Описание</span>
                    <textarea
                      rows={3}
                      value={draft.body}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [item.id]: { ...draft, body: e.target.value },
                        }))
                      }
                      className="mt-1 w-full rounded-xl border border-cream-deep bg-cream/40 px-3 py-2 outline-none ring-copper/40 focus:ring-2"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-ink-muted">Дата и время мероприятия</span>
                    <input
                      type="datetime-local"
                      value={draft.startsAt}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [item.id]: { ...draft, startsAt: e.target.value },
                        }))
                      }
                      className="mt-1 w-full rounded-xl border border-cream-deep bg-cream/40 px-3 py-2 outline-none ring-copper/40 focus:ring-2"
                    />
                  </label>
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block text-sm text-copper underline-offset-2 hover:underline"
                    >
                      Открыть пост →
                    </a>
                  ) : null}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={busyId === item.id}
                      className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-50"
                    >
                      Сохранить правки
                    </button>
                    {item.moderationStatus !== "APPROVED" ? (
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() =>
                          void save(item.id, {
                            status: "APPROVED",
                            saveFields: true,
                          })
                        }
                        className="rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-cream disabled:opacity-50"
                      >
                        В дайджест
                      </button>
                    ) : null}
                    {item.moderationStatus !== "REJECTED" ? (
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => void save(item.id, { status: "REJECTED" })}
                        className="rounded-lg border border-copper/40 px-3 py-1.5 text-xs font-medium text-copper disabled:opacity-50"
                      >
                        Отклонить
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => void save(item.id, { status: "PENDING" })}
                        className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-50"
                      >
                        Вернуть на проверку
                      </button>
                    )}
                  </div>
                </form>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
