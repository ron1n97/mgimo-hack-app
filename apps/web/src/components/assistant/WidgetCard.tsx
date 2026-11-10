"use client";

import Link from "next/link";
import type { AssistantWidget, WidgetKind } from "@/lib/widget-markup";

const KIND_LABEL: Record<WidgetKind, string> = {
  lesson: "Пара",
  task: "Задача",
  grade: "Оценка",
  event: "Событие",
  request: "Заявка",
  today: "Сегодня",
  schedule: "Расписание",
  notification: "Уведомление",
};

export function WidgetCard({
  widget,
  onNavigate,
}: {
  widget: AssistantWidget;
  onNavigate?: () => void;
}) {
  const title =
    widget.title ||
    KIND_LABEL[widget.kind] ||
    widget.kind;
  const meta = [widget.time, widget.status, widget.subtitle]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={widget.href}
      onClick={onNavigate}
      className="mt-2 block rounded-xl border border-ink/10 bg-cream px-3 py-2.5 transition hover:border-copper/40 hover:bg-cream-deep/40"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-ink-muted">
            {KIND_LABEL[widget.kind]}
          </p>
          <p className="truncate text-sm font-medium text-ink">{title}</p>
          {meta ? (
            <p className="mt-0.5 truncate text-xs text-ink-muted">{meta}</p>
          ) : null}
        </div>
        <span className="shrink-0 text-copper" aria-hidden>
          →
        </span>
      </div>
    </Link>
  );
}
