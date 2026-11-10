"use client";

import type { AssistantPart } from "@/lib/widget-markup";
import { WidgetCard } from "./WidgetCard";

export function AssistantMessage({
  parts,
  fallbackText,
  onNavigate,
}: {
  parts?: AssistantPart[];
  fallbackText: string;
  onNavigate?: () => void;
}) {
  const resolved =
    parts && parts.length > 0
      ? parts
      : ([{ type: "text", text: fallbackText }] as AssistantPart[]);

  return (
    <div className="space-y-1 text-sm leading-relaxed text-ink">
      {resolved.map((part, i) => {
        if (part.type === "text") {
          const text = part.text.trim();
          if (!text) return null;
          return (
            <p key={`t-${i}`} className="whitespace-pre-wrap">
              {text}
            </p>
          );
        }
        return (
          <WidgetCard
            key={`w-${i}-${part.widget.kind}-${part.widget.id ?? i}`}
            widget={part.widget}
            onNavigate={onNavigate}
          />
        );
      })}
    </div>
  );
}
