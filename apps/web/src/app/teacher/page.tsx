"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ApiError,
  createTeacherTask,
  deleteTeacherTask,
  fetchTeacherSlots,
  fetchTeacherTasks,
} from "@/lib/api";
import { getUser } from "@/lib/auth";
import type { LessonTaskItem, TeacherSlot } from "@/lib/types";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";

function formatDate(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    weekday: "short",
  });
}

export default function TeacherCabinetPage() {
  const router = useRouter();
  const [slots, setSlots] = useState<TeacherSlot[]>([]);
  const [tasks, setTasks] = useState<LessonTaskItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [slotsRes, tasksRes] = await Promise.all([
        fetchTeacherSlots(),
        fetchTeacherTasks(),
      ]);
      const nextSlots = Array.isArray(slotsRes.slots) ? slotsRes.slots : [];
      setSlots(nextSlots);
      setTasks(Array.isArray(tasksRes) ? tasksRes : []);
      if (!selectedAssignmentId && nextSlots[0]) {
        setSelectedAssignmentId(nextSlots[0].assignmentId);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка загрузки");
      setSlots([]);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [selectedAssignmentId]);

  useEffect(() => {
    const user = getUser();
    if (!user || user.role !== "teacher") {
      router.replace(user?.role === "staff" || user?.role === "admin" ? "/staff" : "/today");
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!selectedAssignmentId) return;
    setSaving(true);
    setError(null);
    try {
      await createTeacherTask({
        assignmentId: selectedAssignmentId,
        title: title.trim(),
        body: body.trim(),
        ...(dueAt ? { dueAt: new Date(dueAt).toISOString() } : {}),
      });
      setTitle("");
      setBody("");
      setDueAt("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось создать задание");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    setError(null);
    try {
      await deleteTeacherTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось удалить");
    }
  }

  return (
    <div className="animate-rise space-y-6">
      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} onRetry={load} /> : null}

      {!loading ? (
        <>
          <section className="space-y-3">
            <h2 className="font-serif text-xl text-ink">Мои слоты</h2>
            {slots.length === 0 ? (
              <EmptyState
                title="Нет закреплённых пар"
                description="Попросите учебный отдел назначить вам занятия."
              />
            ) : (
              <ul className="space-y-2">
                {slots.map((slot) => (
                  <li
                    key={`${slot.assignmentId}-${slot.lesson.id}`}
                    className={`rounded-2xl border px-4 py-3 ${
                      selectedAssignmentId === slot.assignmentId
                        ? "border-copper/40 bg-white"
                        : "border-cream-deep bg-white/50"
                    }`}
                  >
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => setSelectedAssignmentId(slot.assignmentId)}
                    >
                      <p className="text-xs text-copper">
                        {formatDate(slot.lesson.date)} · {slot.lesson.begin}–
                        {slot.lesson.end}
                      </p>
                      <p className="mt-1 font-medium text-ink">
                        {slot.lesson.discipline}
                      </p>
                      <p className="mt-0.5 text-sm text-ink-muted">
                        {slot.lesson.groupLabel}
                        {slot.lesson.auditorium
                          ? ` · ауд. ${slot.lesson.auditorium}`
                          : ""}
                        {slot.taskCount > 0
                          ? ` · заданий: ${slot.taskCount}`
                          : ""}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-cream-deep bg-white/50 p-4">
            <h2 className="font-serif text-xl text-ink">Новое задание</h2>
            <form onSubmit={onCreate} className="mt-3 space-y-3">
              <label className="block text-sm">
                <span className="text-ink-muted">К слоту (assignment)</span>
                <select
                  required
                  value={selectedAssignmentId}
                  onChange={(e) => setSelectedAssignmentId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-cream-deep bg-cream px-3 py-2 text-sm"
                >
                  <option value="" disabled>
                    Выберите слот
                  </option>
                  {[...new Map(slots.map((s) => [s.assignmentId, s])).values()].map(
                    (s) => (
                      <option key={s.assignmentId} value={s.assignmentId}>
                        {s.lesson.discipline} · {s.lesson.groupLabel}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-ink-muted">Заголовок</span>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-cream-deep bg-cream px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="text-ink-muted">Текст</span>
                <textarea
                  required
                  rows={3}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-cream-deep bg-cream px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="text-ink-muted">Срок (необязательно)</span>
                <input
                  type="date"
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-cream-deep bg-cream px-3 py-2 text-sm"
                />
              </label>
              <button
                type="submit"
                disabled={saving || !selectedAssignmentId}
                className="rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-cream disabled:opacity-50"
              >
                {saving ? "Сохраняем…" : "Прикрепить задание"}
              </button>
            </form>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-xl text-ink">Мои задания</h2>
            {tasks.length === 0 ? (
              <EmptyState title="Пока пусто" description="Создайте задание к слоту." />
            ) : (
              <ul className="space-y-2">
                {tasks.map((task) => (
                  <li
                    key={task.id}
                    className="rounded-2xl border border-cream-deep bg-white/50 px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-ink">{task.title}</p>
                        <p className="mt-1 text-sm text-ink-muted">{task.body}</p>
                        <p className="mt-2 text-xs text-ink-muted">
                          Группа {task.groupRuzId}
                          {task.dueAt
                            ? ` · до ${formatDate(task.dueAt)}`
                            : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onDelete(task.id)}
                        className="shrink-0 text-xs text-copper"
                      >
                        Удалить
                      </button>
                    </div>
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
