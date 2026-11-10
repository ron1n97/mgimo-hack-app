"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchUnreadNotificationCount } from "@/lib/api";
import { getToken } from "@/lib/auth";

const items = [
  { href: "/today", label: "Сегодня" },
  { href: "/schedule", label: "Пары" },
  { href: "/clubs", label: "Клубы" },
  { href: "/notifications", label: "Лента", badge: true },
  { href: "/profile", label: "Профиль" },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!getToken()) {
      setUnread(0);
      return;
    }
    let cancelled = false;
    void fetchUnreadNotificationCount()
      .then((count) => {
        if (!cancelled) setUnread(count);
      })
      .catch(() => {
        if (!cancelled) setUnread(0);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-cream-deep bg-cream/95 backdrop-blur md:hidden"
      aria-label="Основная навигация"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-1 pb-[env(safe-area-inset-bottom)]">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const showBadge = "badge" in item && item.badge && unread > 0;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`relative flex flex-col items-center gap-0.5 px-1 py-2.5 text-[11px] font-medium transition ${
                  active ? "text-copper" : "text-ink-muted hover:text-ink"
                }`}
              >
                <span
                  className={`h-1 w-6 rounded-full transition ${
                    active ? "bg-copper" : "bg-transparent"
                  }`}
                  aria-hidden
                />
                <span className="relative">
                  {item.label}
                  {showBadge ? (
                    <span className="absolute -right-3 -top-1 min-w-[1rem] rounded-full bg-copper px-1 text-center text-[9px] font-semibold leading-4 text-cream">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  ) : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
