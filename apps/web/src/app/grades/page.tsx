"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  fetchGradesOverview,
  type GradesOverview,
  type SemesterRatingView,
} from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { PageHeader } from "@/components/campus";

type TabId =
  | "exams"
  | "passes"
  | "current"
  | "social"
  | "byDiscipline";

const TABS: { id: TabId; label: string }[] = [
  { id: "exams", label: "Экзамены" },
  { id: "passes", label: "Зачёты" },
  { id: "current", label: "Текущая аттестация" },
  { id: "social", label: "Соц. характеристики" },
  { id: "byDiscipline", label: "Рейтинг по дисциплине" },
];

function fmt(n: number): string {
  return n.toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function semesterLabel(raw: string): string {
  if (raw === "2025-весна") return "2 семестр · 2025-весна";
  if (raw === "2025-осень") return "1 семестр · 2025-осень";
  if (raw === "2024-весна") return "2 семестр · 2024-весна";
  return raw;
}

export default function GradesPage() {
  const [data, setData] = useState<GradesOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [semester, setSemester] = useState<string>("");
  const [tab, setTab] = useState<TabId>("exams");
  const [helpOpen, setHelpOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchGradesOverview();
      setData(next);
      const sems = next.rating?.semesters ?? [];
      setSemester((prev) =>
        prev && sems.includes(prev) ? prev : (sems[0] ?? ""),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось загрузить учёбу");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rating: SemesterRatingView | null = useMemo(() => {
    if (!data?.rating || !semester) return null;
    return data.rating.bySemester[semester] ?? null;
  }, [data, semester]);

  const debts = data?.debts ?? [];
  const weights = data?.rating?.weights;

  return (
    <div className="animate-rise space-y-6">
      <PageHeader title="Успеваемость" />

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} onRetry={load} /> : null}

      {!loading && !error ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {(data?.rating?.semesters?.length ?? 0) > 0 ? (
              <label className="flex min-w-[12rem] flex-1 items-center gap-2 text-sm">
                <span className="text-ink-muted">Семестр</span>
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="w-full rounded-xl border border-cream-deep bg-white/80 px-3 py-2.5 outline-none ring-copper/40 focus:ring-2"
                >
                  {(data?.rating?.semesters ?? []).map((s) => (
                    <option key={s} value={s}>
                      {semesterLabel(s)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="rounded-xl border border-ink/15 px-3 py-2.5 text-sm font-medium text-ink-muted transition hover:border-ink/30 hover:text-ink"
            >
              Как считается
            </button>
          </div>

          {data?.rating?.disclaimer ? (
            <p className="text-xs text-ink-muted">{data.rating.disclaimer}</p>
          ) : null}

          {debts.length > 0 ? (
            <section className="space-y-2">
              <h2 className="text-lg font-semibold tracking-tight text-ink">Долги</h2>
              <ul className="divide-y divide-copper/20 overflow-hidden rounded-2xl border border-copper/30 bg-copper/5">
                {debts.map((item) => (
                  <li
                    key={`debt-${item.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3.5"
                  >
                    <div>
                      <p className="font-medium text-ink">{item.subject}</p>
                      <p className="text-xs text-ink-muted">
                        {item.date}
                        {item.kind ? ` · ${item.kind}` : ""}
                        {item.lessonHint ? ` · ${item.lessonHint}` : ""}
                      </p>
                    </div>
                    <span className="text-2xl font-semibold text-copper">
                      {item.value}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {rating ? (
            <>
              <section className="space-y-4 rounded-2xl border border-cream-deep bg-white/70 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                  Рейтинговые показатели за семестр
                </p>
                <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
                  <p className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
                    {fmt(rating.overall)}
                  </p>
                  <p className="pb-1 text-lg font-medium text-ink">
                    &lt;{rating.ects}&gt; {rating.label}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { k: "Б1", v: rating.b1 },
                    { k: "Б2", v: rating.b2 },
                    { k: "Б3", v: rating.b3 },
                    { k: "Надбавка", v: rating.bonus },
                  ].map((card) => (
                    <div
                      key={card.k}
                      className="rounded-xl border border-cream-deep bg-cream/50 px-3 py-3"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                        {card.k}
                      </p>
                      <p className="mt-1 text-xl font-semibold tabular-nums text-ink">
                        {fmt(card.v)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <div
                className="-mx-1 flex gap-1 overflow-x-auto pb-1"
                role="tablist"
                aria-label="Разделы успеваемости"
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
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
                        active
                          ? "bg-ink text-cream"
                          : "bg-white/60 text-ink-muted hover:bg-cream-deep hover:text-ink"
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>

              <section className="overflow-hidden rounded-2xl border border-cream-deep bg-white/70">
                {tab === "exams" ? (
                  <ScoreTable
                    empty="Экзаменов в этом семестре нет"
                    rows={rating.exams.map((r) => ({
                      key: r.discipline,
                      left: r.discipline,
                      right: r.display,
                      debt: r.isDebt,
                    }))}
                    headRight="Оценка (Б2)"
                  />
                ) : null}
                {tab === "passes" ? (
                  <ScoreTable
                    empty="Зачётов в этом семестре нет"
                    rows={rating.passes.map((r) => ({
                      key: r.discipline,
                      left: r.discipline,
                      right: r.display,
                      debt: r.isDebt,
                    }))}
                    headRight="Оценка (Б2)"
                  />
                ) : null}
                {tab === "current" ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="border-b border-cream-deep bg-cream/40 text-xs uppercase tracking-wide text-ink-muted">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Дисциплина</th>
                          <th className="px-3 py-3 font-semibold">1-й срез</th>
                          <th className="px-3 py-3 font-semibold">2-й срез</th>
                          <th className="px-3 py-3 font-semibold">3-й срез</th>
                          <th className="px-4 py-3 font-semibold">Среднее (Б1)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-cream-deep">
                        {rating.current.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-ink-muted">
                              Нет срезов
                            </td>
                          </tr>
                        ) : (
                          rating.current.map((r) => (
                            <tr key={r.discipline}>
                              <td className="px-4 py-3 font-medium text-ink">
                                {r.discipline}
                              </td>
                              {r.cuts.map((c, i) => (
                                <td
                                  key={i}
                                  className="px-3 py-3 tabular-nums text-ink"
                                >
                                  {fmt(c)}
                                </td>
                              ))}
                              <td className="px-4 py-3 font-semibold tabular-nums text-ink">
                                {fmt(r.average)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : null}
                {tab === "social" ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="border-b border-cream-deep bg-cream/40 text-[10px] uppercase tracking-wide text-ink-muted sm:text-xs">
                        <tr>
                          <th className="px-3 py-3 font-semibold">Дисциплина</th>
                          <th className="px-2 py-3 font-semibold">Эрудит.</th>
                          <th className="px-2 py-3 font-semibold">Прилеж.</th>
                          <th className="px-2 py-3 font-semibold">Актив.</th>
                          <th className="px-2 py-3 font-semibold">Сам.раб.</th>
                          <th className="px-2 py-3 font-semibold">Этика</th>
                          <th className="px-2 py-3 font-semibold">Посещ.</th>
                          <th className="px-3 py-3 font-semibold">Б3</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-cream-deep">
                        {rating.social.map((r) => (
                          <tr key={r.discipline}>
                            <td className="max-w-[10rem] truncate px-3 py-3 font-medium text-ink">
                              {r.discipline}
                            </td>
                            <td className="px-2 py-3 tabular-nums">{fmt(r.erudition)}</td>
                            <td className="px-2 py-3 tabular-nums">{fmt(r.diligence)}</td>
                            <td className="px-2 py-3 tabular-nums">{fmt(r.activity)}</td>
                            <td className="px-2 py-3 tabular-nums">{fmt(r.independent)}</td>
                            <td className="px-2 py-3 tabular-nums">{fmt(r.ethics)}</td>
                            <td className="px-2 py-3 tabular-nums">{fmt(r.attendance)}</td>
                            <td className="px-3 py-3 font-semibold tabular-nums">
                              {fmt(r.b3)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
                {tab === "byDiscipline" ? (
                  <ScoreTable
                    empty="Нет дисциплин"
                    rows={rating.byDiscipline.map((r) => ({
                      key: r.discipline,
                      left: r.discipline,
                      right: fmt(r.score),
                      debt: r.isDebt,
                    }))}
                    headRight="Оценка"
                  />
                ) : null}
              </section>
            </>
          ) : (
            <EmptyState
              title="Пока нет оценок"
              description="Когда появятся результаты — здесь будет рейтинг за семестр."
            />
          )}
        </>
      ) : null}

      {helpOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="grades-help-title"
          onClick={() => setHelpOpen(false)}
        >
          <div
            className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-cream p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2
                id="grades-help-title"
                className="text-xl font-semibold tracking-tight text-ink"
              >
                Как считается рейтинг
              </h2>
              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                className="rounded-lg px-2 py-1 text-ink-muted hover:bg-cream-deep hover:text-ink"
                aria-label="Закрыть"
              >
                ✕
              </button>
            </div>
            <p className="mb-4 text-sm text-ink-muted">
              Учебная модель для демо-стенда (не офиц. ЛК). Итог за семестр —
              взвешенная сумма блоков, не выше 100.
            </p>
            <ul className="space-y-4 text-sm text-ink">
              <li>
                <p className="font-semibold">Блок 1 — промежуточный контроль</p>
                <p className="text-xs uppercase tracking-wide text-ink-muted">
                  Вес {weights?.b1 ?? 0.4} · макс. 100
                </p>
                <p className="mt-1 text-ink-muted">
                  Среднее по срезам текущей аттестации (три контрольные точки).
                </p>
              </li>
              <li>
                <p className="font-semibold">Блок 2 — сессия</p>
                <p className="text-xs uppercase tracking-wide text-ink-muted">
                  Вес {weights?.b2 ?? 0.5} · макс. 100
                </p>
                <p className="mt-1 text-ink-muted">
                  Экзамены и зачёты. Пересдачи в демо не моделируем отдельно.
                </p>
              </li>
              <li>
                <p className="font-semibold">Блок 3 — соц. характеристики</p>
                <p className="text-xs uppercase tracking-wide text-ink-muted">
                  Вес {weights?.b3 ?? 0.1} · шкала 1–5 → 100%
                </p>
                <p className="mt-1 text-ink-muted">
                  Среднее по шести качествам, нормализованное к 100.
                </p>
              </li>
              <li>
                <p className="font-semibold">Надбавка</p>
                <p className="text-xs uppercase tracking-wide text-ink-muted">
                  Вес {weights?.bonus ?? 0.05} · 0–100
                </p>
                <p className="mt-1 text-ink-muted">
                  Общественная / научная / спортивная работа. Добавляется к итогу;
                  потолок — 100.
                </p>
              </li>
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ScoreTable({
  rows,
  empty,
  headRight,
}: {
  rows: { key: string; left: string; right: string; debt?: boolean }[];
  empty: string;
  headRight: string;
}) {
  if (rows.length === 0) {
    return <p className="px-4 py-8 text-sm text-ink-muted">{empty}</p>;
  }
  return (
    <table className="min-w-full text-left text-sm">
      <thead className="border-b border-cream-deep bg-cream/40 text-xs uppercase tracking-wide text-ink-muted">
        <tr>
          <th className="px-4 py-3 font-semibold">Дисциплина</th>
          <th className="px-4 py-3 text-right font-semibold">{headRight}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-cream-deep">
        {rows.map((r) => (
          <tr key={r.key} className={r.debt ? "bg-copper/5" : undefined}>
            <td className="px-4 py-3.5 font-medium text-ink">{r.left}</td>
            <td className="px-4 py-3.5 text-right tabular-nums text-ink">
              {r.right}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
