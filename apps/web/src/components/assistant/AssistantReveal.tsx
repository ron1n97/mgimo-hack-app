"use client";

import { useEffect, useRef, useState } from "react";
import { typingPlainFromParts } from "@/lib/assistant-text";
import type { AssistantPart } from "@/lib/widget-markup";
import { AssistantMessage } from "./AssistantMessage";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function AssistantReveal({
  parts,
  fallbackText,
  source,
  disclaimer,
  durationMs,
  animateTyping = true,
  onTypingDone,
  onNavigate,
}: {
  parts?: AssistantPart[];
  fallbackText: string;
  source?: "zcode" | "stub";
  disclaimer?: string;
  durationMs?: number;
  /** False for history cards (reopen) — show full answer immediately. */
  animateTyping?: boolean;
  onTypingDone?: () => void;
  onNavigate?: () => void;
}) {
  const plain = typingPlainFromParts(parts, fallbackText);
  const shouldAnimate =
    animateTyping && plain.length > 0 && !prefersReducedMotion();

  const [typed, setTyped] = useState(shouldAnimate ? "" : plain);
  const [typingDone, setTypingDone] = useState(!shouldAnimate);
  const onTypingDoneRef = useRef(onTypingDone);
  onTypingDoneRef.current = onTypingDone;

  useEffect(() => {
    const nextPlain = typingPlainFromParts(parts, fallbackText);
    const animate =
      animateTyping && nextPlain.length > 0 && !prefersReducedMotion();

    if (!animate) {
      setTyped(nextPlain);
      setTypingDone(true);
      if (animateTyping) onTypingDoneRef.current?.();
      return;
    }

    setTyped("");
    setTypingDone(false);
    let i = 0;
    const tick = window.setInterval(() => {
      i += Math.max(1, Math.ceil(nextPlain.length / 80));
      if (i >= nextPlain.length) {
        setTyped(nextPlain);
        setTypingDone(true);
        window.clearInterval(tick);
        onTypingDoneRef.current?.();
      } else {
        setTyped(nextPlain.slice(0, i));
      }
    }, 18);
    return () => window.clearInterval(tick);
  }, [fallbackText, parts, animateTyping]);

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
