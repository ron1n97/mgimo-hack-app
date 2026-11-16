"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, postAiChat, type AiChatResponse } from "@/lib/api";
import { getUser } from "@/lib/auth";
import type { User, UserRole } from "@/lib/types";
import {
  parseAssistantMarkup,
  type AssistantPart,
  type AssistantWidget,
  type WidgetKind,
} from "@/lib/widget-markup";
import { AssistantMessage } from "./AssistantMessage";

type UiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  parts?: AssistantPart[];
  source?: "zcode" | "stub";
  disclaimer?: string;
};

function roleToApi(role: UserRole): string {
  return role.toUpperCase();
}

function mapParts(res: AiChatResponse, role: UserRole): AssistantPart[] {
  if (res.parts?.length) {
    return res.parts.map((part) => {
      if (part.type === "text") return part;
      const w = part.widget;
      return {
        type: "widget" as const,
        widget: {
          kind: w.kind as WidgetKind,
          id: w.id,
          title: w.title,
          subtitle: w.subtitle,
          time: w.time,
          status: w.status,
          href: w.href,
          attrs: w.attrs ?? {},
        } satisfies AssistantWidget,
      };
    });
  }
  return parseAssistantMarkup(res.content, roleToApi(role)).parts;
}

const SUGGESTIONS: Record<UserRole, string[]> = {
  student: ["Что сегодня?", "Мои долги", "Открытые заявки"],
  staff: ["Очередь заявок", "Что срочного сегодня?"],
  admin: ["Очередь заявок", "Сводка на сегодня"],
  teacher: ["Мои пары", "Задания на сегодня"],
};

export function AssistantChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const role = user?.role ?? "student";

  useEffect(() => {
    setUser(getUser());
  }, []);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open, busy]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    setError(null);
    setInput("");
    const userMsg: UiMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
    };
    const history = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    setMessages((prev) => [...prev, userMsg]);
    setBusy(true);

    try {
      const res: AiChatResponse = await postAiChat({
        message: trimmed,
        history,
      });
      const parts = mapParts(res, role);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: res.content,
          parts,
          source: res.source,
          disclaimer: res.disclaimer,
        },
      ]);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Не удалось получить ответ ассистента";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-2xl bg-ink text-cream shadow-soft transition hover:bg-copper md:bottom-6"
        aria-label="Открыть ИИ-ассистента"
      >
        <span className="font-serif text-lg leading-none">AI</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center md:p-6">
          <button
            type="button"
            className="absolute inset-0 bg-ink/40"
            aria-label="Закрыть"
            onClick={() => setOpen(false)}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Ассистент Деканат+"
            className="relative flex h-[min(88dvh,640px)] w-full max-w-lg flex-col rounded-t-3xl border border-ink/10 bg-cream shadow-soft md:rounded-3xl"
          >
            <header className="flex items-center justify-between border-b border-cream-deep px-4 py-3">
              <div>
                <p className="font-serif text-lg text-ink">
                  Ассистент<span className="text-copper">+</span>
                </p>
                <p className="text-xs text-ink-muted">
                  Чат по кабинету · виджеты ведут на экраны
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-1 text-sm text-ink-muted hover:bg-cream-deep/60 hover:text-ink"
              >
                Закрыть
              </button>
            </header>

            <div
              ref={listRef}
              className="flex-1 space-y-3 overflow-y-auto px-4 py-3"
            >
              {messages.length === 0 ? (
                <div className="space-y-3 pt-2">
                  <p className="text-sm text-ink-muted">
                    Спросите про пары, заявки или долги — ответ с кнопками-виджетами.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(SUGGESTIONS[role] ?? SUGGESTIONS.student).map((s) => (
                      <button
                        key={s}
                        type="button"
                        disabled={busy}
                        onClick={() => void send(s)}
                        className="rounded-full border border-ink/15 px-3 py-1.5 text-xs text-ink transition hover:border-copper/40 hover:text-copper"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[92%] rounded-2xl px-3 py-2 ${
                      m.role === "user"
                        ? "bg-ink text-cream"
                        : "border border-ink/10 bg-white/70"
                    }`}
                  >
                    {m.role === "user" ? (
                      <p className="whitespace-pre-wrap text-sm">{m.content}</p>
                    ) : (
                      <>
                        <AssistantMessage
                          parts={m.parts}
                          fallbackText={m.content}
                          onNavigate={() => setOpen(false)}
                        />
                        {m.source === "stub" ? (
                          <p className="mt-2 text-[11px] text-copper">
                            {m.disclaimer ?? "ИИ недоступен — шаблонный ответ."}
                          </p>
                        ) : m.disclaimer ? (
                          <p className="mt-2 text-[11px] text-ink-muted">
                            {m.disclaimer}
                          </p>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              ))}

              {busy ? (
                <p className="text-xs text-ink-muted animate-pulse">
                  Думаю… обычно 15–30 сек (Z Code)
                </p>
              ) : null}
              {error ? (
                <p className="rounded-xl bg-copper/10 px-3 py-2 text-xs text-copper">
                  {error}
                </p>
              ) : null}
            </div>

            <form
              onSubmit={onSubmit}
              className="border-t border-cream-deep p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            >
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Напишите вопрос…"
                  disabled={busy}
                  className="min-w-0 flex-1 rounded-xl border border-ink/15 bg-white/80 px-3 py-2.5 text-sm text-ink outline-none ring-copper/30 placeholder:text-ink-muted focus:ring-2"
                />
                <button
                  type="submit"
                  disabled={busy || !input.trim()}
                  className="rounded-xl bg-copper px-4 py-2.5 text-sm font-medium text-cream transition enabled:hover:bg-copper-dark disabled:opacity-40"
                >
                  →
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
