"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ApiError,
  addDigestSource,
  confirmClub,
  fetchStaffClubs,
  ingestTelegramDigest,
  setClubDigest,
} from "@/lib/api";
import { getUser } from "@/lib/auth";
import type { Club } from "@/lib/types";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";

export default function StaffClubsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Club[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceClubId, setSourceClubId] = useState("");
  const [ingestInfo, setIngestInfo] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStaffClubs();
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

  async function onConfirm(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const updated = await confirmClub(id, true);
      setItems((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось подтвердить");
    } finally {
      setBusyId(null);
    }
  }

  async function onDigest(id: string, digestEnabled: boolean) {
    setBusyId(id);
    setError(null);
    try {
      const updated = await setClubDigest(id, digestEnabled);
      setItems((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось обновить дайджест");
    } finally {
      setBusyId(null);
    }
  }

  async function onAddSource(e: FormEvent) {
    e.preventDefault();
    if (!sourceUrl.trim()) return;
    setBusyId("source");
    setError(null);
    try {
      await addDigestSource({
        url: sourceUrl.trim(),
        clubId: sourceClubId || undefined,
      });
      setSourceUrl("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось добавить источник");
    } finally {
      setBusyId(null);
    }
  }

  async function onIngestTelegram() {
    setBusyId("ingest");
    setError(null);
    setIngestInfo(null);
    try {
      const result = await ingestTelegramDigest();
      setIngestInfo(
        `TG: источников ${result.sourcesOk}/${result.sourcesTried}, постов ${result.postsUpserted}, stub снято ${result.stubsRetired}` +
          (result.errors.length ? `, ошибок ${result.errors.length}` : ""),
      );
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Не удалось стянуть Telegram",
      );
    } finally {
      setBusyId(null);
    }
  }

  const drafts = items.filter((c) => c.status === "DRAFT");
  const confirmed = items.filter((c) => c.status === "CONFIRMED");

  return (
    <div className="animate-rise space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busyId === "ingest"}
          onClick={() => void onIngestTelegram()}
          className="rounded-xl bg-copper px-3.5 py-2 text-sm font-semibold text-cream disabled:opacity-50"
        >
          {busyId === "ingest" ? "Тянем TG…" : "Стянуть посты из Telegram"}
        </button>
        {ingestInfo ? (
          <p className="text-sm text-ink-muted">{ingestInfo}</p>
        ) : null}
      </div>

      <form
        onSubmit={onAddSource}
        className="flex flex-col gap-2 rounded-2xl border border-cream-deep bg-white/50 p-4 sm:flex-row sm:items-end"
      >
        <label className="flex-1 text-xs text-ink-muted">
          URL источника
          <input
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://t.me/…"
            className="mt-1 w-full rounded-xl border border-cream-deep bg-cream/40 px-3 py-2 text-sm text-ink"
          />
        </label>
        <label className="sm:w-56 text-xs text-ink-muted">
          Клуб (опц.)
          <select
            value={sourceClubId}
            onChange={(e) => setSourceClubId(e.target.value)}
            className="mt-1 w-full rounded-xl border border-cream-deep bg-cream/40 px-3 py-2 text-sm text-ink"
          >
            <option value="">Без привязки</option>
            {confirmed.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={busyId === "source"}
          className="rounded-xl bg-ink px-3.5 py-2 text-sm font-semibold text-cream disabled:opacity-50"
        >
          Добавить источник
        </button>
      </form>

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} onRetry={load} /> : null}

      {!loading && !error ? (
        <>
          <section className="space-y-3">
            <h2 className="font-serif text-xl text-ink">На подтверждении</h2>
            {drafts.length === 0 ? (
              <EmptyState title="Очередь пуста" description="Студенческие заявки появятся здесь." />
            ) : (
              <ul className="space-y-3">
                {drafts.map((club) => (
                  <li
                    key={club.id}
                    className="rounded-2xl border border-cream-deep bg-white/50 px-4 py-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-medium text-ink">{club.name}</h3>
                        {club.description ? (
                          <p className="mt-1 text-sm text-ink-muted">{club.description}</p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        disabled={busyId === club.id}
                        onClick={() => void onConfirm(club.id)}
                        className="rounded-xl bg-copper px-3 py-1.5 text-xs font-semibold text-cream disabled:opacity-50"
                      >
                        Подтвердить + digest
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-xl text-ink">Подтверждённые</h2>
            <ul className="space-y-3">
              {confirmed.map((club) => (
                <li
                  key={club.id}
                  className="rounded-2xl border border-cream-deep bg-white/50 px-4 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-ink">{club.name}</h3>
                      <p className="mt-1 text-xs text-ink-muted">
                        Источников: {club.sources.length} · теги:{" "}
                        {club.tags.map((t) => t.name).join(", ") || "—"}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busyId === club.id}
                      onClick={() => void onDigest(club.id, !club.digestEnabled)}
                      className="rounded-xl border border-ink/20 px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-50"
                    >
                      Digest: {club.digestEnabled ? "вкл" : "выкл"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </div>
  );
}
