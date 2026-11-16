"use client";

import type { ReactNode } from "react";
import {
  tidyAssistantParts,
  tokenizeInlineMarkdown,
} from "@/lib/assistant-text";
import type { AssistantPart } from "@/lib/widget-markup";
import { WidgetCard } from "./WidgetCard";

function renderInline(text: string): ReactNode[] {
  return tokenizeInlineMarkdown(text).map((token, i) => {
    if (token.type === "bold") {
      return (
        <strong key={`b-${i}`} className="font-semibold text-ink">
          {token.value}
        </strong>
      );
    }
    if (token.type === "italic") {
      return (
        <em key={`i-${i}`} className="italic">
          {token.value}
        </em>
      );
    }
    return <span key={`t-${i}`}>{token.value}</span>;
  });
}

function TextBlock({ text }: { text: string }) {
  const paragraphs = text.split(/\n{2,}/);
  return (
    <div className="space-y-2">
      {paragraphs.map((para, pi) => {
        const lines = para.split("\n");
        return (
          <p key={`p-${pi}`} className="whitespace-pre-wrap">
            {lines.map((line, li) => (
              <span key={`l-${li}`}>
                {li > 0 ? <br /> : null}
                {renderInline(line)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

export function AssistantMessage({
  parts,
  fallbackText,
  onNavigate,
}: {
  parts?: AssistantPart[];
  fallbackText: string;
  onNavigate?: () => void;
}) {
  const raw =
    parts && parts.length > 0
      ? parts
      : ([{ type: "text", text: fallbackText }] as AssistantPart[]);
  const resolved = tidyAssistantParts(raw);

  return (
    <div className="space-y-2 text-sm leading-relaxed text-ink">
      {resolved.map((part, i) => {
        if (part.type === "text") {
          const text = part.text.trim();
          if (!text) return null;
          return <TextBlock key={`t-${i}`} text={text} />;
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
