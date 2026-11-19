"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ApiError,
  fetchScheduleGroups,
  fetchScheduleSubGroups,
  fetchStaffStudents,
  updateStaffStudent,
  type ScheduleGroup,
  type ScheduleSubGroup,
  type StaffStudentRow,
} from "@/lib/api";
import { getUser } from "@/lib/auth";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";

export default function StaffStudentsPage() {
  const router = useRouter();
  const [items, setItems] = useState<StaffStudentRow[]>([]);
  const [groups, setGroups] = useState<ScheduleGroup[]>([]);
  const [subGroups, setSubGroups] = useState<ScheduleSubGroup[]>([]);
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<StaffStudentRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (query?: string) => {
    setLoading(true);
    setError(null);
    try {
      const [rows, g] = await Promise.all([
        fetchStaffStudents(query),
        fetchScheduleGroups(),
      ]);
      setItems(rows);
      setGroups(g);
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

  useEffect(() => {
    if (!draft?.groupRuzId) {
      setSubGroups([]);
      return;
    }
    let cancelled = false;
    void fetchScheduleSubGroups(draft.groupRuzId)
      .then((rows) => {
        if (!cancelled) setSubGroups(rows);
      })
      .catch(() => {
        if (!cancelled) setSubGroups([]);
      });
    return () => {
      cancelled = true;
    };
  }, [draft?.groupRuzId]);

  function selectStudent(row: StaffStudentRow) {
    setSelectedId(row.id);
    setDraft({ ...row });
    setOk(null);
    setError(null);
  }

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    await load(q);
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!draft || !selectedId) return;
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const selected = groups.find((g) => g.groupRuzId === draft.groupRuzId);
      const updated = await updateStaffStudent(selectedId, {
        fullName: draft.fullName.trim(),
        faculty: draft.faculty.trim(),
        program: draft.program.trim(),
        course: Number(draft.course) || 1,
        groupRuzId: draft.groupRuzId || "",
        groupLabel: selected?.groupLabel ?? draft.groupLabel,
        preferredSubGroupOids: draft.preferredSubGroupOids,
      });
      setItems((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setDraft(updated);
      setOk("Карточка студента сохранена.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="animate-rise mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="font-serif text-3xl text-ink">Студенты</h1>
        <p className="mt-1 text-sm text-ink-muted">
          ФИО, группа и подгруппа — только здесь. В кабинете студента поля только для
          просмотра.
        </p>
      </header>

      <form onSubmit={onSearch} className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск по ФИО, почте, группе"
          className="flex-1 rounded-xl border border-cream-deep bg-cream/40 px-3 py-2.5 text-sm outline-none ring-copper/40 focus:ring-2"
        />
        <button
          type="submit"
          className="rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-cream"
        >
          Найти
        </button>
      </form>

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} onRetry={() => void load(q)} /> : null}

      {!loading && !error && items.length === 0 ? (
        <EmptyState title="Студентов нет" description="Попробуйте другой запрос." />
      ) : null}

      {!loading && items.length > 0 ? (
        <ul className="divide-y divide-cream-deep overflow-hidden rounded-2xl border border-cream-deep bg-white/50">
          {items.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => selectStudent(row)}
                className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition hover:bg-cream/40 ${
                  selectedId === row.id ? "bg-copper/5" : ""
                }`}
              >
                <div>
                  <p className="font-medium text-ink">{row.fullName || row.email}</p>
                  <p className="text-xs text-ink-muted">
                    {row.groupLabel || "Без группы"}
                    {row.course ? ` · курс ${row.course}` : ""}
                  </p>
                </div>
                <span className="text-xs text-ink-muted">{row.email}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {draft ? (
        <form
          onSubmit={onSave}
          className="space-y-3 rounded-2xl border border-cream-deep bg-white/60 p-5"
        >
          <h2 className="font-serif text-xl text-ink">Карточка</h2>
          <label className="block text-sm">
            <span className="text-ink-muted">ФИО</span>
            <input
              required
              value={draft.fullName}
              onChange={(e) => setDraft({ ...draft, fullName: e.target.value })}
              className="mt-1 w-full rounded-xl border border-cream-deep bg-cream/40 px-3 py-2.5 outline-none ring-copper/40 focus:ring-2"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-ink-muted">Факультет</span>
              <input
                value={draft.faculty}
                onChange={(e) => setDraft({ ...draft, faculty: e.target.value })}
                className="mt-1 w-full rounded-xl border border-cream-deep bg-cream/40 px-3 py-2.5 outline-none ring-copper/40 focus:ring-2"
              />
            </label>
            <label className="block text-sm">
              <span className="text-ink-muted">Программа</span>
              <input
                value={draft.program}
                onChange={(e) => setDraft({ ...draft, program: e.target.value })}
                className="mt-1 w-full rounded-xl border border-cream-deep bg-cream/40 px-3 py-2.5 outline-none ring-copper/40 focus:ring-2"
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="text-ink-muted">Курс</span>
            <input
              type="number"
              min={1}
              max={6}
              value={draft.course}
              onChange={(e) =>
                setDraft({ ...draft, course: Number(e.target.value) || 1 })
              }
              className="mt-1 w-full rounded-xl border border-cream-deep bg-cream/40 px-3 py-2.5 outline-none ring-copper/40 focus:ring-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-ink-muted">Учебная группа</span>
            <select
              value={draft.groupRuzId ?? ""}
              onChange={(e) => {
                const id = e.target.value;
                const g = groups.find((x) => x.groupRuzId === id);
                setDraft({
                  ...draft,
                  groupRuzId: id || null,
                  groupLabel: g?.groupLabel ?? "",
                  preferredSubGroupOids: [],
                });
              }}
              className="mt-1 w-full rounded-xl border border-cream-deep bg-cream/40 px-3 py-2.5 outline-none ring-copper/40 focus:ring-2"
            >
              <option value="">Не выбрана</option>
              {groups.map((g) => (
                <option key={g.groupRuzId} value={g.groupRuzId}>
                  {g.groupLabel}
                </option>
              ))}
            </select>
          </label>
          {subGroups.length > 0 ? (
            <fieldset className="text-sm">
              <legend className="text-ink-muted">Подгруппы</legend>
              <div className="mt-2 space-y-1.5">
                {subGroups.map((s) => {
                  const checked = draft.preferredSubGroupOids.includes(s.subGroupOid);
                  return (
                    <label key={s.subGroupOid} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const next = checked
                            ? draft.preferredSubGroupOids.filter(
                                (x) => x !== s.subGroupOid,
                              )
                            : [...draft.preferredSubGroupOids, s.subGroupOid];
                          setDraft({ ...draft, preferredSubGroupOids: next });
                        }}
                      />
                      <span>{s.subGroup}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ) : null}
          {ok ? (
            <p className="rounded-xl border border-emerald-900/15 bg-emerald-900/5 px-3 py-2 text-sm text-emerald-900">
              {ok}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-copper py-3 text-sm font-semibold text-cream disabled:opacity-60"
          >
            {saving ? "Сохраняем…" : "Сохранить карточку"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
