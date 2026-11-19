"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ApiError,
  fetchScheduleGroups,
  fetchTimetableSolves,
  runTimetableSolve,
  type ScheduleGroup,
  type TimetableSolveRun,
} from "@/lib/api";
import { getUser } from "@/lib/auth";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";

function localIso(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysIso(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return localIso(d);
}

export default function StaffTimetablePage() {
  const router = useRouter();
  const [groups, setGroups] = useState<ScheduleGroup[]>([]);
  const [groupRuzId, setGroupRuzId] = useState("");
  const [from, setFrom] = useState(() => localIso());
  const [to, setTo] = useState(() => addDaysIso(localIso(), 6));
  const [engine, setEngine] = useState<"auto" | "heuristic" | "cpsat">("auto");
  const [runs, setRuns] = useState<TimetableSolveRun[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [g, r] = await Promise.all([
        fetchScheduleGroups(),
        fetchTimetableSolves(),
      ]);
      setGroups(g);
      setRuns(r);
      setGroupRuzId((cur) => cur || g[0]?.groupRuzId || "");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка загрузки");
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

  async function onSolve(e: FormEvent) {
    e.preventDefault();
    if (!groupRuzId) return;
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const res = await runTimetableSolve({
        groupRuzIds: [groupRuzId],
        from,
        to,
        engine,
      });
      setOk(
        `${res.result.status} · engine=${res.result.engine} · objective=${res.result.objective} · ${res.result.elapsedMs}ms`,
      );
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Солвер не смог");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="animate-rise mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="font-serif text-3xl text-ink">Оптимизатор расписания</h1>
        <p className="mt-1 text-sm text-ink-muted">
          ADR 0011: назначение пар на слот×аудиторию×преподавателя. CP-SAT (OR-Tools),
          иначе эвристика. Результат — предложение, RUZ SoT не перезаписывается.
        </p>
      </header>

      <form
        onSubmit={onSolve}
        className="space-y-3 rounded-2xl border border-cream-deep bg-white/60 p-5"
      >
        <label className="block text-sm">
          <span className="text-ink-muted">Группа</span>
          <select
            value={groupRuzId}
            onChange={(e) => setGroupRuzId(e.target.value)}
            className="mt-1 w-full rounded-xl border border-cream-deep bg-cream/40 px-3 py-2.5 outline-none ring-copper/40 focus:ring-2"
          >
            {groups.map((g) => (
              <option key={g.groupRuzId} value={g.groupRuzId}>
                {g.groupLabel}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-ink-muted">С</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 w-full rounded-xl border border-cream-deep bg-cream/40 px-3 py-2.5 outline-none ring-copper/40 focus:ring-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-ink-muted">По</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 w-full rounded-xl border border-cream-deep bg-cream/40 px-3 py-2.5 outline-none ring-copper/40 focus:ring-2"
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="text-ink-muted">Движок</span>
          <select
            value={engine}
            onChange={(e) =>
              setEngine(e.target.value as "auto" | "heuristic" | "cpsat")
            }
            className="mt-1 w-full rounded-xl border border-cream-deep bg-cream/40 px-3 py-2.5 outline-none ring-copper/40 focus:ring-2"
          >
            <option value="auto">auto (CP-SAT → heuristic)</option>
            <option value="heuristic">heuristic</option>
            <option value="cpsat">cpsat only</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={busy || !groupRuzId}
          className="w-full rounded-xl bg-copper py-3 text-sm font-semibold text-cream disabled:opacity-60"
        >
          {busy ? "Считаем…" : "Запустить солвер"}
        </button>
      </form>

      {ok ? (
        <p className="rounded-xl border border-emerald-900/15 bg-emerald-900/5 px-3 py-2 text-sm text-emerald-900">
          {ok}
        </p>
      ) : null}
      {error ? <ErrorState message={error} onRetry={load} /> : null}
      {loading ? <LoadingState /> : null}

      {!loading && runs.length === 0 ? (
        <EmptyState
          title="Прогонов ещё нет"
          description="Запустите солвер для группы на неделю."
        />
      ) : null}

      <ul className="divide-y divide-cream-deep overflow-hidden rounded-2xl border border-cream-deep bg-white/50">
        {runs.map((run) => (
          <li key={run.id} className="px-4 py-3">
            <p className="font-medium text-ink">
              {run.status} · {run.engine}
              {run.objective != null ? ` · obj ${run.objective}` : ""}
            </p>
            <p className="text-xs text-ink-muted">
              {run.groupRuzIds?.join(", ")} · {String(run.fromDate).slice(0, 10)}–
              {String(run.toDate).slice(0, 10)}
              {run.elapsedMs != null ? ` · ${run.elapsedMs}ms` : ""}
            </p>
            {run.message ? (
              <p className="mt-1 text-xs text-ink-muted">{run.message}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
