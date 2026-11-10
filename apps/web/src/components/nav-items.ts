import type { UserRole } from "@/lib/types";

export type NavIconName =
  | "today"
  | "schedule"
  | "grades"
  | "profile"
  | "queue"
  | "admin"
  | "bell";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIconName;
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

export function navItemsForRole(role: UserRole | null | undefined): NavItem[] {
  if (role === "admin") return adminItems;
  if (role === "staff") return staffItems;
  return studentItems;
}

export function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
