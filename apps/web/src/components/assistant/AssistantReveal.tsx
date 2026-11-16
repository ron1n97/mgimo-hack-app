"use client";

import { useEffect, useState } from "react";
import type { AssistantPart } from "@/lib/widget-markup";
import { AssistantMessage } from "./AssistantMessage";

export function AssistantReveal({
  parts,
  fallbackText,
  source,
  disclaimer,
  durationMs,
  onNavigate,
}: {
  parts?: AssistantPart[];
  fallbackText: string;
  source?: "zcode" | "stub";
  disclaimer?: string;
  durationMs?: number;
  onNavigate?: () => void;
}) {
  const [phase, setPhase] = useState<"meta" | "body">("meta");

  useEffect(() => {
    const t = window.setTimeout(() => setPhase("body"), 120);
    return () => window.clearTimeout(t);
  }, []);

  const secs =
    durationMs != null ? Math.max(1, Math.round(durationMs / 1000)) : null;

  return (
    <div className="max-w-[92%] space-y-1.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 px-0.5">
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted">
          Ассистент+
        </span>
        <span className="text-[10px] text-ink-muted/50">·</span>
        <span className="text-[10px] text-ink-muted">
          {source === "stub" ? "шаблон" : "Z Code"}
          {secs != null ? ` · ${secs}с` : ""}
        </span>
      </div>

      <div
        className={`rounded-2xl border border-ink/10 bg-white/70 px-3 py-2.5 ${
          phase === "body" ? "assistant-harness-reveal" : "opacity-0"
        }`}
      >
        <AssistantMessage
          parts={parts}
          fallbackText={fallbackText}
          onNavigate={onNavigate}
        />
        {source === "stub" ? (
          <p className="mt-2 text-[11px] text-copper">
            {disclaimer ?? "ИИ недоступен — шаблонный ответ."}
          </p>
        ) : disclaimer ? (
          <p className="mt-2 text-[11px] text-ink-muted">{disclaimer}</p>
        ) : null}
      </div>
    </div>
  );
}
