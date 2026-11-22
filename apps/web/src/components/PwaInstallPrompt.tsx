"use client";

import { useEffect, useRef, useState } from "react";

const DISMISS_KEY = "dekanat_pwa_install_dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [busy, setBusy] = useState(false);
  const bipSeen = useRef(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (sessionStorage.getItem(DISMISS_KEY) === "1") return;

    const onBip = (e: Event) => {
      e.preventDefault();
      bipSeen.current = true;
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
      setIosHint(false);
    };
    window.addEventListener("beforeinstallprompt", onBip);

    const t = window.setTimeout(() => {
      if (sessionStorage.getItem(DISMISS_KEY) === "1" || bipSeen.current) return;
      if (isIos()) {
        setIosHint(true);
        setVisible(true);
      } else if (window.isSecureContext) {
        setVisible(true);
      }
    }, 2500);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.clearTimeout(t);
    };
  }, []);

  if (!visible || isStandalone()) return null;

  async function onInstall() {
    if (!deferred) return;
    setBusy(true);
    try {
      await deferred.prompt();
      await deferred.userChoice;
      setVisible(false);
      sessionStorage.setItem(DISMISS_KEY, "1");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-x-0 top-3 z-40 px-3 md:left-auto md:right-4 md:max-w-sm">
      <div className="rounded-2xl border border-copper/30 bg-cream px-4 py-3 text-ink shadow-soft">
        <p className="text-lg leading-snug">Установить приложение</p>
        <p className="mt-1 text-xs leading-relaxed text-ink-muted">
          {iosHint
            ? "На iPhone: «Поделиться» → «На экран «Домой»»."
            : deferred
              ? "Добавьте Деканат+ на домашний экран — быстрее вход к расписанию."
              : "Если баннер браузера не появился: меню Chrome → «Установить приложение» (нужен HTTPS)."}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {deferred ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void onInstall()}
              className="rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-cream disabled:opacity-60"
            >
              Установить
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              sessionStorage.setItem(DISMISS_KEY, "1");
              setVisible(false);
            }}
            className="rounded-lg px-2 py-1.5 text-xs text-ink-muted"
          >
            Позже
          </button>
        </div>
      </div>
    </div>
  );
}
