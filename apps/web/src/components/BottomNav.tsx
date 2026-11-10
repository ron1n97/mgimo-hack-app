"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getUser } from "@/lib/auth";

const studentItems = [
  { href: "/today", label: "Сегодня" },
  { href: "/schedule", label: "Пары" },
  { href: "/tasks", label: "Задания" },
  { href: "/requests", label: "Заявки" },
  { href: "/profile", label: "Профиль" },
] as const;

const teacherItems = [
  { href: "/teacher", label: "Пары" },
  { href: "/profile", label: "Профиль" },
] as const;

const staffItems = [
  { href: "/staff/requests", label: "Очередь" },
  { href: "/staff/teachers", label: "Преп." },
  { href: "/profile", label: "Профиль" },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    setRole(getUser()?.role ?? null);
  }, [pathname]);

  const items =
    role === "teacher"
      ? teacherItems
      : role === "staff" || role === "admin"
        ? staffItems
        : studentItems;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-cream-deep bg-cream/95 backdrop-blur md:hidden"
      aria-label="Основная навигация"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-1 pb-[env(safe-area-inset-bottom)]">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-1 py-2.5 text-[11px] font-medium transition ${
                  active ? "text-copper" : "text-ink-muted hover:text-ink"
                }`}
              >
                <span
                  className={`h-1 w-6 rounded-full transition ${
                    active ? "bg-copper" : "bg-transparent"
                  }`}
                  aria-hidden
                />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
