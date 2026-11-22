"use client";

import { useEffect, useState } from "react";
import { createDemoNotification } from "@/lib/api";
import { getToken } from "@/lib/auth";
import {
  enableWebPush,
  pushSupported,
  syncWebPushAfterLogin,
} from "@/lib/push";

const DISMISS_KEY = "dekanat_push_prompt_dismissed";

export function PushPrompt() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    if (!getToken() || !pushSupported()) return;
    void syncWebPushAfterLogin();

    const dismissed = sessionStorage.getItem(DISMISS_KEY) === "1";
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator &&
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    setStandalone(isStandalone);

    if (!dismissed && Notification.permission === "default") {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  async function onEnable() {
    setBusy(true);
    setMessage(null);
    const result = await enableWebPush();
    setBusy(false);
    if (result.ok) {
      setMessage("Пуш включён — можно закрыть.");
      setVisible(false);
      sessionStorage.setItem(DISMISS_KEY, "1");
      return;
    }
    const reasons: Record<string, string> = {
      denied: "Разрешение отклонено в настройках браузера.",
      no_vapid: "Сервер без VAPID ключей — пуш пока недоступен.",
      no_sw: "Не удалось зарегистрировать service worker.",
      unsupported: "Браузер не поддерживает Web Push.",
      bad_subscription: "Подписка не сохранилась.",
    };
    setMessage(reasons[result.reason] ?? "Не удалось включить пуш.");
  }

  async function onDemoPush() {
    setBusy(true);
    setMessage(null);
    try {
      const enabled = await enableWebPush();
      if (!enabled.ok && enabled.reason !== "no_vapid") {
        setMessage("Сначала разрешите уведомления.");
        setBusy(false);
        return;
      }
      await createDemoNotification({
        title: "Проверка пуша",
        body: "Если видите это на телефоне — Web Push работает.",
        kind: "grade_posted",
      });
      setMessage(
        enabled.ok
          ? "Создали grade_posted — смотрите системное уведомление."
          : "Уведомление в ленте есть; VAPID не настроен — системный пуш пропущен.",
      );
    } catch {
      setMessage("Не удалось создать демо-уведомление.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 px-3 md:bottom-4 md:left-auto md:right-4 md:max-w-sm">
      <div className="rounded-2xl border border-copper/30 bg-ink px-4 py-3 text-cream shadow-soft">
        <p className="text-lg leading-snug">
          Уведомления на телефон
        </p>
        <p className="mt-1 text-xs leading-relaxed text-cream/75">
          {standalone
            ? "Разрешите пуш, чтобы оценки и дайджест приходили на экран блокировки."
            : "На Android Chrome: «Установить приложение», затем включите пуш. iOS — только после установки на домашний экран (ограниченно)."}
        </p>
        {message ? (
          <p className="mt-2 text-xs text-cream/85">{message}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void onEnable()}
            className="rounded-lg bg-copper px-3 py-1.5 text-xs font-medium text-cream disabled:opacity-60"
          >
            Включить пуш
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void onDemoPush()}
            className="rounded-lg border border-cream/25 px-3 py-1.5 text-xs text-cream/90 disabled:opacity-60"
          >
            Тест оценки
          </button>
          <button
            type="button"
            onClick={() => {
              sessionStorage.setItem(DISMISS_KEY, "1");
              setVisible(false);
            }}
            className="rounded-lg px-2 py-1.5 text-xs text-cream/60"
          >
            Позже
          </button>
        </div>
      </div>
    </div>
  );
}
