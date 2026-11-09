"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { login, register, ApiError } from "@/lib/api";
import { getToken, setSession } from "@/lib/auth";

type Mode = "login" | "register";

const DEMO = [
  { email: "anna.risk@demo.local", password: "Demo123!", note: "студент (риск)" },
  { email: "boris.ok@demo.local", password: "Demo123!", note: "студент" },
  { email: "roman.guskov@demo.local", password: "Demo123!", note: "студент (Роман)" },
  { email: "staff@demo.local", password: "Demo123!", note: "сотрудник деканата" },
  { email: "admin@demo.local", password: "Demo123!", note: "админ" },
] as const;

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState<string>(DEMO[0].email);
  const [password, setPassword] = useState<string>(DEMO[0].password);
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getToken()) {
      router.replace("/today");
    }
  }, [router]);

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
      setSession(result.accessToken, result.user);
      const home =
        result.user.role === "admin"
          ? "/admin"
          : result.user.role === "staff"
            ? "/staff/requests"
            : "/today";
      router.replace(home);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-2.5rem)] max-w-md flex-col justify-center px-4 py-10">
      <div className="animate-rise">
        <h1 className="font-serif text-4xl leading-tight text-ink sm:text-5xl">
          Деканат<span className="text-copper">+</span>
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          Расписание из RUZ, заявки и учёба — в одном кабинете. Для студентов и сотрудников.
        </p>
      </div>

      <div className="animate-rise-delay mt-8 rounded-2xl border border-cream-deep bg-white/50 p-5 shadow-soft">
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
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={8}
            />
          </label>

          {error ? (
            <p className="rounded-xl border border-copper/25 bg-copper/5 px-3 py-2 text-sm text-copper-dark" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-copper py-3 text-sm font-semibold text-cream transition hover:bg-copper-dark disabled:opacity-60"
          >
            {loading ? "Секунду…" : mode === "login" ? "Войти" : "Создать аккаунт"}
          </button>
        </form>
      </div>

      <div className="mt-6 rounded-2xl border border-dashed border-ink/15 bg-ink/[0.03] p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
          Быстрый вход для жюри
        </p>
        <ul className="mt-3 space-y-2">
          {DEMO.map((acc) => (
            <li key={acc.email}>
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setEmail(acc.email);
                  setPassword(acc.password);
                }}
                className="w-full rounded-xl px-2 py-2 text-left text-sm transition hover:bg-white/60"
              >
                <span className="font-medium text-ink">{acc.note}</span>
                <span className="mt-0.5 block text-xs text-ink-muted">{acc.email}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
