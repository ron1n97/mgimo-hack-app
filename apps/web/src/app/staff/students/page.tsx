"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ApiError,
  fetchScheduleGroups,
  fetchScheduleSubGroups,
  fetchStaffRequests,
  fetchStaffStudents,
  isMeoServiceRequest,
  updateStaffStudent,
  type ScheduleGroup,
  type ScheduleSubGroup,
  type StaffStudentRow,
} from "@/lib/api";
import { getUser } from "@/lib/auth";
import type { ServiceRequest } from "@/lib/types";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";

function isMeoStudent(row: StaffStudentRow): boolean {
  const blob = `${row.groupLabel} ${row.faculty} ${row.program}`.toLowerCase();
  return blob.includes("мэо") || blob.includes("meo");
}

function requestStatusLabel(status: ServiceRequest["status"]): string {
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

export default function StaffStudentsPage() {
  const router = useRouter();
  const [items, setItems] = useState<StaffStudentRow[]>([]);
  const [groups, setGroups] = useState<ScheduleGroup[]>([]);
  const [subGroups, setSubGroups] = useState<ScheduleSubGroup[]>([]);
  const [allRequests, setAllRequests] = useState<ServiceRequest[]>([]);
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<StaffStudentRow | null>(null);
  const [panel, setPanel] = useState<"card" | "requests">("card");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const meoGroups = useMemo(
    () =>
      groups.filter((g) => {
        const label = g.groupLabel.toLowerCase();
        return label.includes("мэо") || label.includes("meo");
      }),
    [groups],
  );

  const load = useCallback(async (query?: string) => {
    setLoading(true);
    setError(null);
    try {
      const [rows, g, reqs] = await Promise.all([
        fetchStaffStudents(query),
        fetchScheduleGroups(),
        fetchStaffRequests().catch(() => [] as ServiceRequest[]),
      ]);
      setItems(rows.filter(isMeoStudent));
      setGroups(g);
      setAllRequests(
        (Array.isArray(reqs) ? reqs : []).filter(isMeoServiceRequest),
      );
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

  const studentRequests = useMemo(() => {
    if (!selectedId) return [];
    return allRequests.filter((r) => r.studentUserId === selectedId);
  }, [allRequests, selectedId]);

  function selectStudent(row: StaffStudentRow, nextPanel: "card" | "requests" = "card") {
    setSelectedId(row.id);
    setDraft({ ...row });
    setPanel(nextPanel);
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
      const selected = meoGroups.find((g) => g.groupRuzId === draft.groupRuzId);
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
        <EmptyState title="Студентов МЭО нет" description="Попробуйте другой запрос." />
      ) : null}

      {!loading && items.length > 0 ? (
        <ul className="divide-y divide-cream-deep overflow-hidden rounded-2xl border border-cream-deep bg-white/50">
          {items.map((row) => {
            const count = allRequests.filter((r) => r.studentUserId === row.id).length;
            return (
              <li key={row.id}>
                <div
                  className={`flex w-full items-start justify-between gap-3 px-4 py-3 ${
                    selectedId === row.id ? "bg-copper/5" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => selectStudent(row, "card")}
                    className="min-w-0 flex-1 text-left transition hover:opacity-80"
                  >
                    <p className="font-medium text-ink">{row.fullName || row.email}</p>
                    <p className="text-xs text-ink-muted">
                      {row.groupLabel || "Без группы"}
                      {row.course ? ` · курс ${row.course}` : ""}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => selectStudent(row, "requests")}
                    className="shrink-0 rounded-lg border border-cream-deep px-2.5 py-1.5 text-xs font-medium text-ink hover:border-copper/40 hover:bg-cream/40"
                    title="Заявления студента"
                  >
                    Заявки{count > 0 ? ` · ${count}` : ""}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {draft && panel === "requests" ? (
        <section className="space-y-3 rounded-2xl border border-cream-deep bg-white/60 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-ink">Заявления</h2>
              <p className="text-sm text-ink-muted">{draft.fullName}</p>
            </div>
            <button
              type="button"
              onClick={() => setPanel("card")}
              className="text-xs font-medium text-copper hover:underline"
            >
              К карточке
            </button>
          </div>
          {studentRequests.length === 0 ? (
            <EmptyState
              title="Заявок нет"
              description="Этот студент ещё ничего не подавал."
            />
          ) : (
            <ul className="space-y-2">
              {studentRequests.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-cream-deep bg-cream/30 px-3 py-3"
                >
                  <p className="text-xs text-ink-muted">{requestStatusLabel(item.status)}</p>
                  <p className="font-medium text-ink">{item.subject}</p>
                  <p className="mt-1 text-sm text-ink-muted">{item.type}</p>
                  {item.body ? (
                    <p className="mt-2 text-sm text-ink">{item.body}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {draft && panel === "card" ? (
        <form
          onSubmit={onSave}
          className="space-y-3 rounded-2xl border border-cream-deep bg-white/60 p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-ink">Карточка</h2>
            <button
              type="button"
              onClick={() => setPanel("requests")}
              className="text-xs font-medium text-copper hover:underline"
            >
              Заявления
            </button>
          </div>
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
                const g = meoGroups.find((x) => x.groupRuzId === id);
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
              {meoGroups.map((g) => (
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
