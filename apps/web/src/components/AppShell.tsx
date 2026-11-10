"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearSession, getUser } from "@/lib/auth";
import type { User } from "@/lib/types";
import { BottomNav } from "./BottomNav";
import { DisclaimerBanner } from "./DisclaimerBanner";

const studentLinks = [
  { href: "/today", label: "Сегодня" },
  { href: "/schedule", label: "Расписание" },
  { href: "/tasks", label: "Задания" },
  { href: "/grades", label: "Учёба" },
  { href: "/requests", label: "Заявки" },
  { href: "/notifications", label: "Уведомления" },
];

const teacherLinks = [
  { href: "/teacher", label: "Мои пары" },
  { href: "/profile", label: "Профиль" },
];

const staffLinks = [
  { href: "/staff/requests", label: "Очередь" },
  { href: "/staff/teachers", label: "Преподаватели" },
  { href: "/profile", label: "Профиль" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const isAuthPage = pathname === "/";

  useEffect(() => {
    setUser(getUser());
  }, [pathname]);

  useEffect(() => {
    if (isAuthPage) return;
    if (!getUser()) {
      router.replace("/");
    }
  }, [isAuthPage, router, pathname]);

  function logout() {
    clearSession();
    router.replace("/");
  }

  if (isAuthPage) {
    return (
      <div className="min-h-dvh bg-cream text-ink">
        <DisclaimerBanner />
        <main>{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-cream text-ink">
      <DisclaimerBanner />
      <header className="border-b border-cream-deep/80 bg-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link
            href={
              user?.role === "teacher"
                ? "/teacher"
                : user?.role === "staff" || user?.role === "admin"
                  ? "/staff/requests"
                  : "/today"
            }
            className="group"
          >
            <span className="font-serif text-xl tracking-tight text-ink sm:text-2xl">
              Деканат<span className="text-copper">+</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Десктоп">
            {(user?.role === "teacher"
              ? teacherLinks
              : user?.role === "staff" || user?.role === "admin"
                ? staffLinks
                : studentLinks
            ).map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3 py-1.5 text-sm transition ${
                    active ? "bg-ink text-cream" : "text-ink-muted hover:bg-cream-deep/60 hover:text-ink"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            {user?.role === "admin" ? (
              <Link
                href="/admin"
                className={`rounded-lg px-3 py-1.5 text-sm transition ${
                  pathname.startsWith("/admin")
                    ? "bg-copper text-cream"
                    : "text-ink-muted hover:bg-cream-deep/60 hover:text-ink"
                }`}
              >
                Админ
              </Link>
            ) : null}
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/notifications"
              className="text-sm text-ink-muted hover:text-ink md:hidden"
              aria-label="Уведомления"
            >
              ●
            </Link>
            {user ? (
              <Link
                href="/profile"
                className="hidden max-w-[10rem] truncate text-xs text-ink-muted hover:text-ink sm:block"
                title="Профиль"
              >
                {user.fullName}
              </Link>
            ) : null}
            <Link
              href="/profile"
              className="rounded-lg border border-ink/15 px-2.5 py-1 text-xs text-ink-muted transition hover:border-ink/30 hover:text-ink"
            >
              Профиль
            </Link>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-ink/15 px-2.5 py-1 text-xs text-ink-muted transition hover:border-ink/30 hover:text-ink"
            >
              Выйти
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-6 md:pb-10">{children}</main>
      <BottomNav />
    </div>
  );
}
