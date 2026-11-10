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
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [groups, setGroups] = useState<ScheduleGroup[]>([]);
  const [subGroups, setSubGroups] = useState<ScheduleSubGroup[]>([]);
  const [subGroupsLoading, setSubGroupsLoading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [groupRuzId, setGroupRuzId] = useState("");
  const [preferredSubGroupOids, setPreferredSubGroupOids] = useState<string[]>([]);
  const [faculty, setFaculty] = useState("");
  const [program, setProgram] = useState("");
  const [course, setCourse] = useState("1");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [me, g] = await Promise.all([fetchMe(), fetchScheduleGroups()]);
      setFullName(me.fullName);
      setEmail(me.email);
      setPhone(me.phone ?? "");
      setGroupRuzId(me.groupRuzId ?? "");
      setPreferredSubGroupOids(me.preferredSubGroupOids ?? []);
      setFaculty(me.faculty && me.faculty !== "Не указан" ? me.faculty : "");
      setProgram(me.program && me.program !== "Не указана" ? me.program : "");
      setCourse(String(me.course && me.course > 0 ? me.course : 1));
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
    setSubGroupsLoading(true);
    void fetchScheduleSubGroups(groupRuzId)
      .then((rows) => {
        if (!cancelled) setSubGroups(rows);
      })
      .catch(() => {
        if (!cancelled) setSubGroups([]);
      })
      .finally(() => {
        if (!cancelled) setSubGroupsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [groupRuzId]);

  function onGroupChange(next: string) {
    setGroupRuzId(next);
    setPreferredSubGroupOids([]);
  }

  function toggleSubGroup(oid: string) {
    setPreferredSubGroupOids((prev) =>
      prev.includes(oid) ? prev.filter((x) => x !== oid) : [...prev, oid],
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const selected = groups.find((g) => g.groupRuzId === groupRuzId);
      const courseNum = Number(course);
      const updated = await updateProfile({
        fullName: fullName.trim(),
        phone: phone.trim(),
        faculty: faculty.trim() || "Не указан",
        program: program.trim() || "Не указана",
        course: Number.isFinite(courseNum) ? courseNum : 1,
        groupRuzId: groupRuzId || undefined,
        groupLabel: selected?.groupLabel,
        preferredSubGroupOids,
      });
      const token = getToken();
      if (token) setSession(token, updated);
      setOk("Сохранено. Расписание, бот и шапка заявлений обновятся сразу.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Открываем профиль…" />;
  if (error && !email) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="animate-rise mx-auto max-w-lg space-y-6">
      <header>
        <h1 className="font-serif text-3xl text-ink">Профиль</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Данные для расписания, Telegram-бота и шапки заявлений.
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
            placeholder="Как в зачётке"
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

        <label className="block text-sm">
          <span className="text-ink-muted">Факультет</span>
          <input
            value={faculty}
            onChange={(e) => setFaculty(e.target.value)}
            className="mt-1 w-full rounded-xl border border-cream-deep bg-cream/40 px-3 py-2.5 outline-none ring-copper/40 focus:ring-2"
            placeholder="Международные отношения"
          />
        </label>

        <label className="block text-sm">
          <span className="text-ink-muted">Направление / программа</span>
          <input
            value={program}
            onChange={(e) => setProgram(e.target.value)}
            className="mt-1 w-full rounded-xl border border-cream-deep bg-cream/40 px-3 py-2.5 outline-none ring-copper/40 focus:ring-2"
            placeholder="Бакалавриат МО"
          />
        </label>

        <label className="block text-sm">
          <span className="text-ink-muted">Курс</span>
          <select
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            className="mt-1 w-full rounded-xl border border-cream-deep bg-cream/40 px-3 py-2.5 outline-none ring-copper/40 focus:ring-2"
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="text-ink-muted">Учебная группа</span>
          <select
            value={groupRuzId}
            onChange={(e) => onGroupChange(e.target.value)}
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
              ? "Список групп пока пуст — обновите страницу чуть позже."
              : "После выбора в «Расписании» появятся пары из RUZ."}
          </span>
        </label>

        {groupRuzId ? (
          <fieldset className="block text-sm">
            <legend className="text-ink-muted">Подгруппы / языки</legend>
            {subGroupsLoading ? (
              <p className="mt-2 text-xs text-ink-muted">Загружаем варианты…</p>
            ) : subGroups.length === 0 ? (
              <p className="mt-2 text-xs text-ink-muted">
                Пока нет подгрупп в синхронизированном расписании — после sync
                появятся здесь. Без выбора календарь показывает все параллели.
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {subGroups.map((sg) => {
                  const checked = preferredSubGroupOids.includes(sg.subGroupOid);
                  return (
                    <li key={sg.subGroupOid}>
                      <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-cream-deep bg-cream/30 px-3 py-2">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={checked}
                          onChange={() => toggleSubGroup(sg.subGroupOid)}
                        />
                        <span className="text-sm text-ink">{sg.subGroup}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
            <span className="mt-1 block text-xs text-ink-muted">
              Отметьте свои языковые / потоковые подгруппы — лишние параллели
              скроются в расписании.
            </span>
          </fieldset>
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
