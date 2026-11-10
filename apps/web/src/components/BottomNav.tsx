"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getUser } from "@/lib/auth";
import type { UserRole } from "@/lib/types";

type NavIcon = "today" | "schedule" | "grades" | "profile" | "queue" | "admin" | "bell";

type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
};

const studentItems: NavItem[] = [
  { href: "/today", label: "Сегодня", icon: "today" },
  { href: "/schedule", label: "Пары", icon: "schedule" },
  { href: "/grades", label: "Учёба", icon: "grades" },
  { href: "/profile", label: "Профиль", icon: "profile" },
];

const staffItems: NavItem[] = [
  { href: "/staff/requests", label: "Очередь", icon: "queue" },
  { href: "/today", label: "Сегодня", icon: "today" },
  { href: "/notifications", label: "Лента", icon: "bell" },
  { href: "/profile", label: "Профиль", icon: "profile" },
];

const adminItems: NavItem[] = [
  { href: "/staff/requests", label: "Очередь", icon: "queue" },
  { href: "/admin", label: "Админ", icon: "admin" },
  { href: "/notifications", label: "Лента", icon: "bell" },
  { href: "/profile", label: "Профиль", icon: "profile" },
];

function itemsForRole(role: UserRole | null): NavItem[] {
  if (role === "admin") return adminItems;
  if (role === "staff") return staffItems;
  return studentItems;
}

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function TabIcon({ name, active }: { name: NavIcon; active: boolean }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  switch (name) {
    case "today":
      return (
        <svg {...common}>
          <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
          <path d="M8 3.5v3M16 3.5v3M3.5 10h17" />
          <path d="M8.5 14h3M12.5 14h3" opacity={active ? 1 : 0.7} />
        </svg>
      );
    case "schedule":
      return (
        <svg {...common}>
          <path d="M4 7h16M4 12h16M4 17h10" />
          <circle cx="18" cy="17" r="2.25" fill={active ? "currentColor" : "none"} />
        </svg>
      );
    case "grades":
      return (
        <svg {...common}>
          <path d="M4 19V5h4.5l3.5 8 3.5-8H20v14" />
          <path d="M8 19v-6M16 19v-6" opacity={active ? 1 : 0.75} />
        </svg>
      );
    case "profile":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.25" />
          <path d="M5 19.5c1.6-3.2 4-4.8 7-4.8s5.4 1.6 7 4.8" />
        </svg>
      );
    case "queue":
      return (
        <svg {...common}>
          <path d="M8 7h12M8 12h12M8 17h12" />
          <circle cx="4.5" cy="7" r="1.25" fill="currentColor" stroke="none" />
          <circle cx="4.5" cy="12" r="1.25" fill="currentColor" stroke="none" />
          <circle cx="4.5" cy="17" r="1.25" fill="currentColor" stroke="none" />
        </svg>
      );
    case "admin":
      return (
        <svg {...common}>
          <path d="M12 3.5 19.5 7v4.2c0 4.4-3 7.7-7.5 9.3-4.5-1.6-7.5-4.9-7.5-9.3V7L12 3.5Z" />
          <path d="M9.5 12.2 11.2 14l3.5-3.8" />
        </svg>
      );
    case "bell":
      return (
        <svg {...common}>
          <path d="M6.5 16.5h11l-1.2-1.4V11a4.3 4.3 0 0 0-8.6 0v4.1L6.5 16.5Z" />
          <path d="M10.2 18.2a1.8 1.8 0 0 0 3.6 0" />
        </svg>
      );
  }
}

export function BottomNav() {
  const pathname = usePathname();
  const [role, setRole] = useState<UserRole | null>(null);

  useEffect(() => {
    setRole(getUser()?.role ?? null);
  }, [pathname]);

  const items = itemsForRole(role);

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 md:hidden"
      aria-label="Основная навигация"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      <div className="pointer-events-auto mx-auto w-[min(100%-1.5rem,28rem)]">
        <ul className="liquid-glass-nav flex items-stretch gap-0.5 rounded-[1.35rem] px-1.5 py-1.5">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href} className="min-w-0 flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  data-active={active ? "true" : "false"}
                  className={`liquid-glass-tab flex flex-col items-center gap-0.5 rounded-[1.05rem] px-1 py-2 text-[10px] font-medium tracking-wide ${
                    active
                      ? "bg-ink/[0.07] text-copper"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  <span
                    className={`liquid-glass-tab-icon flex h-7 w-7 items-center justify-center rounded-full ${
                      active ? "bg-copper/15 text-copper" : "text-ink-muted"
                    }`}
                  >
                    <TabIcon name={item.icon} active={active} />
                  </span>
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
