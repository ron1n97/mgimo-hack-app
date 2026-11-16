"use client";

import { useEffect, useState } from "react";

const STEPS = [
  "Читаю контекст кабинета",
  "Смотрю расписание и заявки",
  "Собираю ответ с виджетами",
] as const;

export function AssistantThinking({ startedAt }: { startedAt: number }) {
  const [step, setStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const tick = window.setInterval(() => {
      setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    }, 250);
    return () => window.clearInterval(tick);
  }, [startedAt]);

  useEffect(() => {
    const advance = window.setInterval(() => {
      setStep((s) => (s + 1) % STEPS.length);
    }, 2800);
    return () => window.clearInterval(advance);
  }, []);

  return (
    <div
      className="assistant-harness-run max-w-[92%] rounded-2xl border border-ink/10 bg-white/70 px-3 py-3"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted">
          Ход агента
        </p>
        <p className="tabular-nums text-[11px] text-ink-muted">{elapsed}с</p>
      </div>

      <div className="mt-2.5 space-y-1.5">
        {STEPS.map((label, i) => {
          const state =
            i < step ? "done" : i === step ? "active" : "pending";
          return (
            <div
              key={label}
              className={`flex items-center gap-2 text-sm ${
                state === "pending"
                  ? "text-ink-muted/55"
                  : state === "active"
                    ? "text-ink"
                    : "text-ink-muted"
              }`}
            >
              <span
                className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] ${
                  state === "done"
                    ? "border-copper/40 bg-copper/15 text-copper"
                    : state === "active"
                      ? "border-ink/30 assistant-harness-dot"
                      : "border-ink/15"
                }`}
                aria-hidden
              >
                {state === "done" ? "✓" : state === "active" ? "" : ""}
              </span>
              <span className={state === "active" ? "font-medium" : undefined}>
                {label}
                {state === "active" ? "…" : ""}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] text-ink-muted">
        Z Code · обычно 15–30 сек
      </p>
    </div>
  );
}
