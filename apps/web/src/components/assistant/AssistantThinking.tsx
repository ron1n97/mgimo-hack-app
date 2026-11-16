"use client";

export type HarnessStep = {
  id: string;
  tool: string;
  label: string;
  status: "running" | "done";
};

export function AssistantThinking({
  steps,
  startedAt,
  elapsedSec,
}: {
  steps: HarnessStep[];
  startedAt: number;
  elapsedSec: number;
}) {
  const visible =
    steps.length > 0
      ? steps
      : [
          {
            id: "boot",
            tool: "boot",
            label: "Подключаюсь к модели",
            status: "running" as const,
          },
        ];

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
        <p className="tabular-nums text-[11px] text-ink-muted">{elapsedSec}с</p>
      </div>

      <div className="mt-2.5 space-y-1.5">
        {visible.map((step) => {
          const active = step.status === "running";
          return (
            <div
              key={step.id}
              className={`flex items-center gap-2 text-sm ${
                active ? "text-ink" : "text-ink-muted"
              }`}
            >
              <span
                className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] ${
                  step.status === "done"
                    ? "border-copper/40 bg-copper/15 text-copper"
                    : "border-ink/30 assistant-harness-dot"
                }`}
                aria-hidden
              >
                {step.status === "done" ? "✓" : ""}
              </span>
              <span className={active ? "font-medium" : undefined}>
                {step.label}
                {active ? "…" : ""}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] text-ink-muted">
        {steps.length
          ? `${steps.filter((s) => s.status === "done").length}/${steps.length} шагов · Z Code`
          : "Жду первый tool-call…"}
      </p>
      <span className="sr-only">started {startedAt}</span>
    </div>
  );
}
