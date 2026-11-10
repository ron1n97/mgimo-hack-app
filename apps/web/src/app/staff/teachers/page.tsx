"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ApiError,
  assignTeacherToLesson,
  fetchScheduleGroups,
  fetchStaffTeacherAssignments,
  fetchStaffTeachers,
  removeTeacherAssignment,
  type ScheduleGroup,
} from "@/lib/api";
import { getUser } from "@/lib/auth";
import type { TeacherAssignmentRow, TeacherListItem } from "@/lib/types";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";

export default function StaffTeachersPage() {
  const router = useRouter();
  const [teachers, setTeachers] = useState<TeacherListItem[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignmentRow[]>([]);
  const [groups, setGroups] = useState<ScheduleGroup[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [teacherUserId, setTeacherUserId] = useState("");
  const [groupRuzId, setGroupRuzId] = useState("");
  const [discipline, setDiscipline] = useState("Международное право");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [t, a, g] = await Promise.all([
        fetchStaffTeachers(),
        fetchStaffTeacherAssignments(),
        fetchScheduleGroups(),
      ]);
      setTeachers(t);
      setAssignments(a);
      setGroups(g);
      if (!teacherUserId && t[0]) setTeacherUserId(t[0].id);
      if (!groupRuzId && g[0]) setGroupRuzId(g[0].groupRuzId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [groupRuzId, teacherUserId]);

  useEffect(() => {
    const user = getUser();
    if (!user || (user.role !== "staff" && user.role !== "admin")) {
      router.replace(user?.role === "teacher" ? "/teacher" : "/today");
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function onAssign(e: FormEvent) {
    e.preventDefault();
    if (!teacherUserId || !groupRuzId || !discipline.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const group = groups.find((g) => g.groupRuzId === groupRuzId);
      await assignTeacherToLesson({
        teacherUserId,
        groupRuzId,
        groupLabel: group?.groupLabel,
        discipline: discipline.trim(),
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось назначить");
    } finally {
      setSaving(false);
    }
  }

  async function onRemove(id: string) {
    setError(null);
    try {
      await removeTeacherAssignment(id);
      setAssignments((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось удалить");
    }
  }

  return (
    <div className="animate-rise space-y-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-wider text-copper">
          Кабинет сотрудника
        </p>
        <h1 className="mt-1 font-serif text-3xl text-ink">Назначение пар</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Закрепите группу и дисциплину за преподавателем (без solver).
        </p>
      </header>

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} onRetry={load} /> : null}

      {!loading ? (
        <>
          <section className="rounded-2xl border border-cream-deep bg-white/50 p-4">
            <h2 className="font-serif text-xl text-ink">Новое назначение</h2>
            <form onSubmit={onAssign} className="mt-3 space-y-3">
              <label className="block text-sm">
                <span className="text-ink-muted">Преподаватель</span>
                <select
                  required
                  value={teacherUserId}
                  onChange={(e) => setTeacherUserId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-cream-deep bg-cream px-3 py-2 text-sm"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.teacherProfile?.fullName ?? t.email}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-ink-muted">Группа</span>
                <select
                  required
                  value={groupRuzId}
                  onChange={(e) => setGroupRuzId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-cream-deep bg-cream px-3 py-2 text-sm"
                >
                  {groups.length === 0 ? (
                    <option value="8033">2МЭО-01 (8033)</option>
                  ) : (
                    groups.map((g) => (
                      <option key={g.groupRuzId} value={g.groupRuzId}>
                        {g.groupLabel} ({g.groupRuzId})
                      </option>
                    ))
                  )}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-ink-muted">Дисциплина</span>
                <input
                  required
                  value={discipline}
                  onChange={(e) => setDiscipline(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-cream-deep bg-cream px-3 py-2 text-sm"
                />
              </label>
              <button
                type="submit"
                disabled={saving || !teacherUserId}
                className="rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-cream disabled:opacity-50"
              >
                {saving ? "Сохраняем…" : "Назначить"}
              </button>
            </form>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-xl text-ink">Текущие назначения</h2>
            {assignments.length === 0 ? (
              <EmptyState
                title="Пока нет назначений"
                description="Назначьте преподавателю группу и дисциплину."
              />
            ) : (
              <ul className="space-y-2">
                {assignments.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-cream-deep bg-white/50 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-ink">
                        {a.teacher?.fullName ?? a.teacherUserId}
                      </p>
                      <p className="mt-1 text-sm text-ink-muted">
                        {a.discipline ?? "—"} · {a.groupLabel ?? a.groupRuzId}
                        {a._count?.tasks ? ` · заданий: ${a._count.tasks}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemove(a.id)}
                      className="shrink-0 text-xs text-copper"
                    >
                      Снять
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
