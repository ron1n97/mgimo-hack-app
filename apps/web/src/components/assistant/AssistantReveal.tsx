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
  const [typed, setTyped] = useState("");
  const [typingDone, setTypingDone] = useState(false);

  useEffect(() => {
    const full = fallbackText || "";
    if (!full) {
      setTypingDone(true);
      return;
    }
    setTyped("");
    setTypingDone(false);
    let i = 0;
    const tick = window.setInterval(() => {
      i += Math.max(1, Math.ceil(full.length / 80));
      if (i >= full.length) {
        setTyped(full);
        setTypingDone(true);
        window.clearInterval(tick);
      } else {
        setTyped(full.slice(0, i));
      }
    }, 18);
    return () => window.clearInterval(tick);
  }, [fallbackText]);

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

      <div className="assistant-harness-reveal rounded-2xl border border-ink/10 bg-white/70 px-3 py-2.5">
        {!typingDone ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
            {typed}
            <span className="assistant-harness-caret ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 bg-copper align-middle" />
          </p>
        ) : (
          <AssistantMessage
            parts={parts}
            fallbackText={fallbackText}
            onNavigate={onNavigate}
          />
        )}
        {typingDone && source === "stub" ? (
          <p className="mt-2 text-[11px] text-copper">
            {disclaimer ?? "ИИ недоступен — шаблонный ответ."}
          </p>
        ) : null}
        {typingDone && source !== "stub" && disclaimer ? (
          <p className="mt-2 text-[11px] text-ink-muted">{disclaimer}</p>
        ) : null}
      </div>
    </div>
  );
}
