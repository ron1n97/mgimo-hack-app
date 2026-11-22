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
import { getToken, getUser, setSession } from "@/lib/auth";
import {
  FieldInput,
  PrimaryButton,
  SurfaceCard,
} from "@/components/campus";

type Mode = "login" | "register";

const DEMO_LOGIN_BUILD_FLAG =
  process.env.NEXT_PUBLIC_DEMO_LOGIN === "1" ||
  process.env.NEXT_PUBLIC_DEMO_LOGIN === "true";

const FALLBACK_PERSONAS: DemoPersonaPublic[] = [
  { id: "student-anna", buttonLabel: "Войти как студент Рискова", roleHint: "student" },
  { id: "student-boris", buttonLabel: "Войти как студент Спокойный", roleHint: "student" },
  { id: "student-kirill", buttonLabel: "Войти как студент Орлов (МЭО)", roleHint: "student" },
  {
    id: "staff-elena",
    buttonLabel: "Войти как сотрудник Соколова",
    roleHint: "staff",
  },
  { id: "admin-platform", buttonLabel: "Войти как администратор", roleHint: "admin" },
];

function homeForRole(role: string): string {
  if (role === "admin") return "/admin";
  if (role === "staff") return "/staff";
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
      router.replace(homeForRole(getUser()?.role ?? "student"));
    }
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    fetchDemoPersonas()
      .then((items) => {
        if (cancelled) return;
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
        <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Деканат<span className="text-copper">+</span>
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          Расписание, заявки и учёба — в одном кабинете.
        </p>
      </div>

      {showDemo ? (
        <SurfaceCard className="animate-rise-delay mt-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Быстрый вход для стенда
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            Один тап — кабинет нужной роли.
          </p>
          <ul className="mt-4 grid gap-2">
            {personas.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={demoBusyId !== null || loading}
                  onClick={() => onDemoPersona(p.id)}
                  className="w-full rounded-lg border border-cream-deep bg-cream px-3 py-3 text-left text-sm font-semibold text-ink transition hover:border-copper/40 hover:bg-white disabled:opacity-60"
                >
                  {demoBusyId === p.id ? "Входим…" : p.buttonLabel}
                </button>
              </li>
            ))}
          </ul>
        </SurfaceCard>
      ) : null}

      <SurfaceCard className="animate-rise-delay mt-6">
        <div className="mb-5 flex gap-1 rounded-lg bg-cream p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
              mode === "login" ? "bg-white text-ink shadow-sm" : "text-ink-muted"
            }`}
          >
            Вход
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
              mode === "register" ? "bg-white text-ink shadow-sm" : "text-ink-muted"
            }`}
          >
            Регистрация
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          {mode === "register" ? (
            <label className="block text-sm">
              <span className="text-ink-muted">ФИО</span>
              <FieldInput
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Как к вам обращаться"
                autoComplete="name"
              />
            </label>
          ) : null}
          <label className="block text-sm">
            <span className="text-ink-muted">Почта</span>
            <FieldInput
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="имя@почта.ru"
              autoComplete="email"
            />
          </label>
          <label className="block text-sm">
            <span className="text-ink-muted">Пароль</span>
            <FieldInput
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="не меньше 8 символов"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              minLength={8}
            />
          </label>

          {error ? (
            <p
              className="rounded-lg border border-accent/25 bg-accent/5 px-3 py-2 text-sm text-accent"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <PrimaryButton
            type="submit"
            disabled={loading || demoBusyId !== null}
          >
            {loading
              ? "Секунду…"
              : mode === "login"
                ? "Войти"
                : "Создать аккаунт"}
          </PrimaryButton>
        </form>
      </SurfaceCard>
    </div>
  );
}
