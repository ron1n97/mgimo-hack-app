"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  ApiError,
  fetchMe,
  fetchScheduleGroups,
  fetchScheduleSubGroups,
  updateProfile,
  type ScheduleGroup,
  type ScheduleSubGroup,
} from "@/lib/api";
import { setSession, getToken } from "@/lib/auth";
import type { UserRole } from "@/lib/types";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";

function ReadOnlyField({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="block text-sm">
      <span className="text-ink-muted">{label}</span>
      <p className="mt-1 w-full rounded-xl border border-cream-deep bg-cream/20 px-3 py-2.5 text-ink">
        {value || "—"}
      </p>
      {hint ? <span className="mt-1 block text-xs text-ink-muted">{hint}</span> : null}
    </div>
  );
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [groups, setGroups] = useState<ScheduleGroup[]>([]);
  const [subGroups, setSubGroups] = useState<ScheduleSubGroup[]>([]);
  const [role, setRole] = useState<UserRole>("student");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [groupRuzId, setGroupRuzId] = useState("");
  const [groupLabel, setGroupLabel] = useState("");
  const [preferredSubGroupOids, setPreferredSubGroupOids] = useState<string[]>([]);
  const [faculty, setFaculty] = useState("");
  const [program, setProgram] = useState("");
  const [course, setCourse] = useState("1");
  const [department, setDepartment] = useState("");

  const isStudent = role === "student";
  const isStaffView = role === "admin" || role === "staff";
  const isTeacher = role === "teacher";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [me, g] = await Promise.all([fetchMe(), fetchScheduleGroups()]);
      setRole(me.role);
      setFullName(me.fullName);
      setEmail(me.email);
      setPhone(me.phone ?? "");
      setGroupRuzId(me.groupRuzId ?? "");
      setGroupLabel(me.groupName ?? "");
      setPreferredSubGroupOids(me.preferredSubGroupOids ?? []);
      setFaculty(me.faculty && me.faculty !== "Не указан" ? me.faculty : "");
      setProgram(me.program && me.program !== "Не указана" ? me.program : "");
      setCourse(String(me.course && me.course > 0 ? me.course : 1));
      setDepartment(me.department ?? "");
      setGroups(g);
      const token = getToken();
      if (token) setSession(token, me);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось загрузить профиль");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!groupRuzId) {
      setSubGroups([]);
      return;
    }
    let cancelled = false;
    void fetchScheduleSubGroups(groupRuzId)
      .then((rows) => {
        if (!cancelled) setSubGroups(rows);
      })
      .catch(() => {
        if (!cancelled) setSubGroups([]);
      });
    return () => {
      cancelled = true;
    };
  }, [groupRuzId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const selected = groups.find((g) => g.groupRuzId === groupRuzId);
      const updated = await updateProfile(
        isStudent
          ? {
              fullName: fullName.trim(),
              phone: phone.trim(),
            }
          : isStaffView
            ? {
                fullName: fullName.trim(),
                phone: phone.trim(),
                department: department.trim() || undefined,
                groupRuzId: groupRuzId || "",
                groupLabel: selected?.groupLabel ?? "",
              }
            : {
                fullName: fullName.trim(),
                phone: phone.trim(),
                department: department.trim() || undefined,
              },
      );
      const token = getToken();
      if (token) setSession(token, updated);
      setOk(
        isStaffView
          ? "Сохранено. Расписание обновится для выбранной группы просмотра."
          : isStudent
            ? "Сохранены контакты. Академические данные заданы из базы."
            : "Сохранено.",
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Открываем профиль…" />;
  if (error && !email) return <ErrorState message={error} onRetry={load} />;

  const subgroupLabels = preferredSubGroupOids
    .map((oid) => subGroups.find((s) => s.subGroupOid === oid)?.subGroup ?? oid)
    .filter(Boolean);

  return (
    <div className="animate-rise mx-auto max-w-lg space-y-6">
      <header>
        <h1 className="font-serif text-3xl text-ink">Профиль</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {isStaffView
            ? "Контакты сотрудника и группа для просмотра расписания."
            : isTeacher
              ? "Данные преподавателя и телефон для Telegram-бота."
              : "Академические поля фиксированы из базы; можно менять ФИО и телефон."}
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-2xl border border-cream-deep bg-white/50 p-5"
      >
        <label className="block text-sm">
          <span className="text-ink-muted">ФИО</span>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-cream-deep bg-cream/40 px-3 py-2.5 outline-none ring-copper/40 focus:ring-2"
            placeholder={isStudent ? "Как в зачётке" : "ФИО"}
            autoComplete="name"
          />
        </label>

        <label className="block text-sm">
          <span className="text-ink-muted">Почта</span>
          <input
            value={email}
            disabled
            className="mt-1 w-full rounded-xl border border-cream-deep bg-cream/20 px-3 py-2.5 text-ink-muted"
          />
        </label>

        {isStudent ? (
          <>
            <ReadOnlyField
              label="Направление / факультет"
              value={faculty}
              hint="Из карточки студента — не редактируется в кабинете."
            />
            <ReadOnlyField label="Программа" value={program} />
            <ReadOnlyField label="Курс" value={course} />
            <ReadOnlyField
              label="Учебная группа"
              value={groupLabel || groups.find((g) => g.groupRuzId === groupRuzId)?.groupLabel || ""}
              hint="Расписание подтягивается по этой привязке."
            />
            <ReadOnlyField
              label="Языковая / потоковая подгруппа"
              value={subgroupLabels.length ? subgroupLabels.join(", ") : "Не задана"}
            />
          </>
        ) : null}

        {isStaffView ? (
          <>
            <label className="block text-sm">
              <span className="text-ink-muted">Подразделение</span>
              <input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="mt-1 w-full rounded-xl border border-cream-deep bg-cream/40 px-3 py-2.5 outline-none ring-copper/40 focus:ring-2"
                placeholder="Учебный отдел"
              />
            </label>

            <label className="block text-sm">
              <span className="text-ink-muted">Группа для просмотра</span>
              <select
                value={groupRuzId}
                onChange={(e) => setGroupRuzId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-cream-deep bg-cream/40 px-3 py-2.5 outline-none ring-copper/40 focus:ring-2"
              >
                <option value="">Не выбрана</option>
                {groups.map((g) => (
                  <option key={g.groupRuzId} value={g.groupRuzId}>
                    {g.groupLabel}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-ink-muted">
                {groups.length === 0
                  ? "Каталог групп пуст — дождитесь синхронизации RUZ."
                  : "Любая группа из каталога — для просмотра расписания, не зачисление."}
              </span>
            </label>
          </>
        ) : null}

        {isTeacher ? (
          <label className="block text-sm">
            <span className="text-ink-muted">Кафедра / подразделение</span>
            <input
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="mt-1 w-full rounded-xl border border-cream-deep bg-cream/40 px-3 py-2.5 outline-none ring-copper/40 focus:ring-2"
              placeholder="Кафедра"
            />
          </label>
        ) : null}

        <label className="block text-sm">
          <span className="text-ink-muted">Телефон для бота</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded-xl border border-cream-deep bg-cream/40 px-3 py-2.5 outline-none ring-copper/40 focus:ring-2"
            placeholder="+7 900 111-11-11"
            inputMode="tel"
            autoComplete="tel"
          />
          <span className="mt-1 block text-xs text-ink-muted">
            Тот же номер отправьте контактом в Telegram-боте — войдёте в свой кабинет.
          </span>
        </label>

        {error ? (
          <p className="rounded-xl border border-copper/25 bg-copper/5 px-3 py-2 text-sm text-copper-dark" role="alert">
            {error}
          </p>
        ) : null}
        {ok ? (
          <p className="rounded-xl border border-emerald-900/15 bg-emerald-900/5 px-3 py-2 text-sm text-emerald-900">
            {ok}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-copper py-3 text-sm font-semibold text-cream transition hover:bg-copper-dark disabled:opacity-60"
        >
          {saving ? "Сохраняем…" : "Сохранить"}
        </button>
      </form>
    </div>
  );
}
