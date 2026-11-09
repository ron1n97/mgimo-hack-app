"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ApiError,
  createRequest,
  downloadRequestDocx,
  draftRequestWithAi,
} from "@/lib/api";

const TYPES = [
  "Справка об обучении",
  "Академический отпуск",
  "Перенос экзамена",
  "Иное",
] as const;

export default function NewRequestPage() {
  const router = useRouter();
  const [type, setType] = useState<string>(TYPES[0]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function onDraft() {
    setError(null);
    setHint(null);
    setDrafting(true);
    try {
      const result = await draftRequestWithAi({
        type,
        subject: subject || type,
        notes: notes || undefined,
      });
      setBody(result.draft);
      if (result.source === "stub") {
        setHint(
          result.disclaimer ??
            "Показан шаблон: ИИ временно недоступен. Отредактируйте текст вручную.",
        );
      } else {
        setHint("Черновик от ИИ — поправьте при необходимости, можно скачать Word.");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось получить черновик ИИ");
    } finally {
      setDrafting(false);
    }
  }

  async function onExportDocx() {
    if (!body.trim()) {
      setError("Сначала заполните текст заявления или нажмите «Черновик ИИ».");
      return;
    }
    setError(null);
    setExporting(true);
    try {
      await downloadRequestDocx({
        type,
        body,
        subject: subject || undefined,
      });
      setHint("Word-файл скачан — можно распечатать или приложить к заявке.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось скачать Word");
    } finally {
      setExporting(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await createRequest({ type, subject, body });
      router.replace("/requests");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось отправить");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="animate-rise mx-auto max-w-xl space-y-6">
      <header>
        <Link href="/requests" className="text-sm text-copper">
          ← К заявкам
        </Link>
        <h1 className="mt-2 font-serif text-3xl text-ink">Новая заявка</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Черновик ИИ → правки в тексте → Word при необходимости → отправка в деканат.
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-cream-deep bg-white/50 p-5">
        <label className="block text-sm">
          <span className="text-ink-muted">Тип</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="mt-1 w-full rounded-xl border border-cream-deep bg-cream/40 px-3 py-2.5 outline-none ring-copper/40 focus:ring-2"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="text-ink-muted">Тема</span>
          <input
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-1 w-full rounded-xl border border-cream-deep bg-cream/40 px-3 py-2.5 outline-none ring-copper/40 focus:ring-2"
            placeholder="Краткая формулировка"
          />
        </label>

        <label className="block text-sm">
          <span className="text-ink-muted">Заметки для ИИ (необязательно)</span>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 w-full rounded-xl border border-cream-deep bg-cream/40 px-3 py-2.5 outline-none ring-copper/40 focus:ring-2"
            placeholder="Срок, причина, номер приказа…"
          />
        </label>

        <div>
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-ink-muted">Текст заявления</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onDraft}
                disabled={drafting}
                className="rounded-lg border border-copper/40 px-3 py-1.5 text-xs font-semibold text-copper transition hover:bg-copper/10 disabled:opacity-60"
              >
                {drafting ? "Пишем…" : "Черновик ИИ"}
              </button>
              <button
                type="button"
                onClick={() => void onExportDocx()}
                disabled={exporting || !body.trim()}
                className="rounded-lg border border-ink/20 px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-ink/5 disabled:opacity-60"
              >
                {exporting ? "Собираем…" : "Скачать Word"}
              </button>
            </div>
          </div>
          <textarea
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={14}
            className="w-full rounded-xl border border-cream-deep bg-[#fbf8f1] px-4 py-3 font-serif text-[15px] leading-relaxed text-ink outline-none ring-copper/40 focus:ring-2"
            placeholder="Текст официального заявления…"
            spellCheck
          />
          <p className="mt-1 text-xs text-ink-muted">
            Заполните факультет, курс и группу в{" "}
            <Link href="/profile" className="text-copper underline-offset-2 hover:underline">
              профиле
            </Link>
            — тогда шапка заявления соберётся без дыр.
          </p>
        </div>

        {hint && !error ? (
          <p className="rounded-xl border border-ink/10 bg-ink/[0.03] px-3 py-2 text-sm text-ink-muted">
            {hint}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-xl border border-copper/25 bg-copper/5 px-3 py-2 text-sm text-copper-dark" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-ink py-3 text-sm font-semibold text-cream hover:bg-ink/90 disabled:opacity-60"
        >
          {saving ? "Отправка…" : "Отправить заявку"}
        </button>
      </form>
    </div>
  );
}
