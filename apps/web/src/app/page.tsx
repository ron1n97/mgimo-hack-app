"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ApiError,
  demoLogin,
  DemoPersonaPublic,
  fetchDemoPersonas,
  login,
  register,
} from "@/lib/api";
import { getToken, setSession } from "@/lib/auth";

type Mode = "login" | "register";

/** Build-time hint; production VPS images set this via Dockerfile ARG. */
const DEMO_LOGIN_BUILD_FLAG =
  process.env.NEXT_PUBLIC_DEMO_LOGIN === "1" ||
  process.env.NEXT_PUBLIC_DEMO_LOGIN === "true";

/** Fallback labels (no emails/passwords) when build flag is on before API responds. */
const FALLBACK_PERSONAS: DemoPersonaPublic[] = [
  { id: "student-anna", buttonLabel: "Войти как студент Рискова", roleHint: "student" },
  { id: "student-boris", buttonLabel: "Войти как студент Спокойный", roleHint: "student" },
  { id: "student-roman", buttonLabel: "Войти как студент Гуськов", roleHint: "student" },
  {
    id: "teacher-ivanova",
    buttonLabel: "Войти как преподаватель Иванова",
    roleHint: "teacher",
  },
  {
    id: "staff-elena",
    buttonLabel: "Войти как сотрудник Соколова",
    roleHint: "staff",
  },
  { id: "admin-platform", buttonLabel: "Войти как администратор", roleHint: "admin" },
];

function homeForRole(role: string): string {
  if (role === "admin") return "/admin";
  if (role === "staff") return "/staff/requests";
  return "/today";
}

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoBusyId, setDemoBusyId] = useState<string | null>(null);
  const [personas, setPersonas] = useState<DemoPersonaPublic[] | null>(
    DEMO_LOGIN_BUILD_FLAG ? FALLBACK_PERSONAS : null,
  );

  useEffect(() => {
    if (getToken()) {
      router.replace("/today");
    }
  }, [router]);

  // Authoritative gate is the API (DEMO_QUICK_LOGIN). Lets demo VPS enable
  // buttons without a web rebuild; hides them if API rejects.
  useEffect(() => {
    let cancelled = false;
    fetchDemoPersonas()
      .then((items) => {
        if (cancelled) return;
        // API is the runtime gate; hide buttons when disabled (even if build flag was on).
        setPersonas(items);
      })
      .catch(() => {
        /* keep build-flag fallback if any */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function finishAuth(result: Awaited<ReturnType<typeof login>>) {
    setSession(result.accessToken, result.user);
    router.replace(homeForRole(result.user.role));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result =
        mode === "login"
          ? await login(email.trim(), password)
          : await register({
              email: email.trim(),
              password,
              fullName: fullName.trim(),
            });
      await finishAuth(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  }

  async function onDemoPersona(personaId: string) {
    setError(null);
    setDemoBusyId(personaId);
    setMode("login");
    try {
      const result = await demoLogin(personaId);
      await finishAuth(result);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Не удалось войти демо-аккаунтом",
      );
    } finally {
      setDemoBusyId(null);
    }
  }

  const showDemo = personas !== null && personas.length > 0;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-2.5rem)] max-w-md flex-col justify-center px-4 py-10">
      <div className="animate-rise">
        <h1 className="font-serif text-4xl leading-tight text-ink sm:text-5xl">
          Деканат<span className="text-copper">+</span>
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          Расписание из RUZ, заявки и учёба — в одном кабинете. Для студентов и
          сотрудников.
        </p>
      </div>

      {showDemo ? (
        <div className="animate-rise-delay mt-8 rounded-2xl border border-cream-deep/80 bg-white/35 p-4 shadow-soft backdrop-blur-md">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            Быстрый вход для стенда
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            Один тап — кабинет нужной роли. Пароли в приложение не попадают.
          </p>
          <ul className="mt-4 grid gap-2">
            {personas.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={demoBusyId !== null || loading}
                  onClick={() => onDemoPersona(p.id)}
                  className="w-full rounded-2xl border border-white/60 bg-gradient-to-b from-white/70 to-white/35 px-3 py-3 text-left text-sm font-semibold text-ink shadow-soft backdrop-blur-sm transition hover:from-white/90 hover:to-white/50 active:scale-[0.99] disabled:opacity-60"
                >
                  {demoBusyId === p.id ? "Входим…" : p.buttonLabel}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="animate-rise-delay mt-6 rounded-2xl border border-cream-deep bg-white/50 p-5 shadow-soft">
        <div className="mb-5 flex gap-2 rounded-xl bg-cream p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
              mode === "login" ? "bg-ink text-cream" : "text-ink-muted"
            }`}
          >
            Вход
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
              mode === "register" ? "bg-ink text-cream" : "text-ink-muted"
            }`}
          >
            Регистрация
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          {mode === "register" ? (
            <label className="block text-sm">
              <span className="text-ink-muted">ФИО</span>
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-cream-deep bg-cream/40 px-3 py-2.5 outline-none ring-copper/40 focus:ring-2"
                placeholder="Как к вам обращаться"
                autoComplete="name"
              />
            </label>
          ) : null}
          <label className="block text-sm">
            <span className="text-ink-muted">Почта</span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-cream-deep bg-cream/40 px-3 py-2.5 outline-none ring-copper/40 focus:ring-2"
              placeholder="имя@почта.ru"
              autoComplete="email"
            />
          </label>
          <label className="block text-sm">
            <span className="text-ink-muted">Пароль</span>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-cream-deep bg-cream/40 px-3 py-2.5 outline-none ring-copper/40 focus:ring-2"
              placeholder="не меньше 8 символов"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              minLength={8}
            />
          </label>

          {error ? (
            <p
              className="rounded-xl border border-copper/25 bg-copper/5 px-3 py-2 text-sm text-copper-dark"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading || demoBusyId !== null}
            className="w-full rounded-xl bg-copper py-3 text-sm font-semibold text-cream transition hover:bg-copper-dark disabled:opacity-60"
          >
            {loading
              ? "Секунду…"
              : mode === "login"
                ? "Войти"
                : "Создать аккаунт"}
          </button>
        </form>
      </div>
    </div>
  );
}
