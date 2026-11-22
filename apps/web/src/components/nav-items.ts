import type { UserRole } from "@/lib/types";

export type NavIconName =
  | "today"
  | "schedule"
  | "grades"
  | "profile"
  | "queue"
  | "admin"
  | "bell"
  | "clubs"
  | "teacher";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIconName;
};

/** Align with desktop studentLinks: core scenarios on the thumb bar. */
const studentItems: NavItem[] = [
  { href: "/today", label: "Сегодня", icon: "today" },
  { href: "/schedule", label: "Пары", icon: "schedule" },
  { href: "/grades", label: "Учёба", icon: "grades" },
  { href: "/requests", label: "Заявки", icon: "queue" },
  { href: "/clubs", label: "Клубы", icon: "clubs" },
  { href: "/notifications", label: "Лента", icon: "bell" },
];

const teacherItems: NavItem[] = [
  { href: "/teacher", label: "Пары", icon: "teacher" },
  { href: "/today", label: "Сегодня", icon: "today" },
  { href: "/notifications", label: "Лента", icon: "bell" },
  { href: "/profile", label: "Профиль", icon: "profile" },
];

const staffItems: NavItem[] = [
  { href: "/staff", label: "Кабинет", icon: "queue" },
  { href: "/staff/requests", label: "Заявки", icon: "bell" },
  { href: "/staff/students", label: "Студенты", icon: "grades" },
  { href: "/staff/clubs", label: "Клубы", icon: "clubs" },
  { href: "/profile", label: "Профиль", icon: "profile" },
];

const adminItems: NavItem[] = [
  { href: "/staff", label: "Кабинет", icon: "queue" },
  { href: "/admin", label: "Админ", icon: "admin" },
  { href: "/staff/requests", label: "Заявки", icon: "bell" },
  { href: "/staff/clubs", label: "Клубы", icon: "clubs" },
  { href: "/profile", label: "Профиль", icon: "profile" },
];

export function navItemsForRole(role: UserRole | null | undefined): NavItem[] {
  if (role === "admin") return adminItems;
  if (role === "staff") return staffItems;
  if (role === "teacher") return teacherItems;
  return studentItems;
}

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/staff") {
    return pathname === "/staff";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
