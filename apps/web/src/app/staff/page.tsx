"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";

const tiles = [
  {
    href: "/staff/announce",
    title: "Объявления",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M4 10v4h3l5 4V6L7 10H4Z" strokeLinejoin="round" />
        <path d="M16 9.5a3.5 3.5 0 0 1 0 5" strokeLinecap="round" />
        <path d="M18.5 7.5a6 6 0 0 1 0 9" strokeLinecap="round" opacity="0.7" />
      </svg>
    ),
  },
  {
    href: "/staff/timetable",
    title: "Подбор пар",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
        <path d="M8 3.5v3M16 3.5v3M3.5 10h17" strokeLinecap="round" />
        <path d="M8 14h3M13 14h3M8 17h8" strokeLinecap="round" opacity="0.75" />
      </svg>
    ),
  },
  {
    href: "/staff/requests",
    title: "Заявки",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M8 7h12M8 12h12M8 17h12" strokeLinecap="round" />
        <circle cx="4.5" cy="7" r="1.25" fill="currentColor" stroke="none" />
        <circle cx="4.5" cy="12" r="1.25" fill="currentColor" stroke="none" />
        <circle cx="4.5" cy="17" r="1.25" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: "/staff/students",
    title: "Студенты",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M8 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" strokeLinecap="round" />
        <path d="M16 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" strokeLinecap="round" />
        <path d="M4.5 19c.8-2.8 2.6-4.2 5-4.2 1.1 0 2 .3 2.8.8" strokeLinecap="round" />
        <path d="M12.8 15.6c.8-.4 1.7-.7 2.7-.7 2.4 0 4.2 1.4 5 4.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/staff/clubs",
    title: "Клубы",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M12 3.5 19.5 7v4.2c0 4.4-3 7.7-7.5 9.3-4.5-1.6-7.5-4.9-7.5-9.3V7L12 3.5Z" strokeLinejoin="round" />
      </svg>
    ),
  },
] as const;

export default function StaffCabinetPage() {
  const router = useRouter();

  useEffect(() => {
    const user = getUser();
    if (user && user.role !== "staff" && user.role !== "admin") {
      router.replace("/today");
    }
  }, [router]);

  return (
    <div className="animate-rise mx-auto max-w-3xl space-y-8">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map((tile) => (
          <li key={tile.href}>
            <Link
              href={tile.href}
              className="flex flex-col items-center gap-3 rounded-2xl border border-cream-deep bg-white/60 px-4 py-6 text-center transition hover:border-copper/40 hover:bg-cream/40"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-ink/5 text-copper">
                {tile.icon}
              </span>
              <span className="text-sm font-medium text-ink">{tile.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
