import { getToken, clearSession } from "./auth";
import type {
  AuthResponse,
  GradeItem,
  NotificationItem,
  RequestStatus,
  ScheduleItem,
  ServiceRequest,
  TodayHub,
  User,
  UserRole,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
  signal?: AbortSignal;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true, signal } = options;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch {
    throw new ApiError(
      `Сервер недоступен. Проверьте интернет и попробуйте снова.`,
      0,
    );
  }

  if (response.status === 401 && auth) {
    clearSession();
    if (typeof window !== "undefined" && window.location.pathname !== "/") {
      window.location.href = "/";
    }
  }

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      (typeof (data as { message: unknown }).message === "string" ||
        Array.isArray((data as { message: unknown }).message))
        ? Array.isArray((data as { message: unknown }).message)
          ? (data as { message: string[] }).message.join(", ")
          : String((data as { message: string }).message)
        : `Ошибка сервера (${response.status})`;
    throw new ApiError(message, response.status);
  }

  return data as T;
}

export function getApiBaseUrl(): string {
  return API_URL;
}

type ApiUser = {
  id: string;
  email: string;
  role: string;
  phoneE164?: string | null;
  studentProfile?: {
    fullName?: string;
    groupLabel?: string;
    groupRuzId?: string | null;
    faculty?: string;
    program?: string;
    course?: number;
  } | null;
  staffProfile?: {
    fullName?: string;
  } | null;
};

function mapRole(role: string): UserRole {
  return role === "STAFF" || role === "ADMIN" || role === "staff" ? "staff" : "student";
}

export function mapUser(raw: ApiUser): User {
  const fullName =
    raw.studentProfile?.fullName ??
    raw.staffProfile?.fullName ??
    raw.email;
  return {
    id: raw.id,
    email: raw.email,
    fullName,
    role: mapRole(raw.role),
    groupName: raw.studentProfile?.groupLabel,
    groupRuzId: raw.studentProfile?.groupRuzId ?? undefined,
    phone: raw.phoneE164 ?? undefined,
  };
}

function mapStatus(status: string): RequestStatus {
  switch (status) {
    case "SUBMITTED":
    case "submitted":
      return "submitted";
    case "IN_PROGRESS":
    case "in_review":
      return "in_review";
    case "DONE":
    case "approved":
      return "approved";
    case "REJECTED":
    case "rejected":
      return "rejected";
    default:
      return "draft";
  }
}

function toApiStatus(status: RequestStatus): string {
  switch (status) {
    case "submitted":
      return "SUBMITTED";
    case "in_review":
      return "IN_PROGRESS";
    case "approved":
      return "DONE";
    case "rejected":
      return "REJECTED";
    default:
      return "SUBMITTED";
  }
}

function mapLesson(raw: Record<string, unknown>): ScheduleItem {
  const dateRaw = raw.date;
  const date =
    typeof dateRaw === "string"
      ? dateRaw.slice(0, 10)
      : undefined;
  return {
    id: String(raw.id),
    title: String(raw.discipline ?? raw.title ?? "Занятие"),
    startTime: String(raw.begin ?? raw.startTime ?? ""),
    endTime: String(raw.end ?? raw.endTime ?? ""),
    room: (raw.auditorium as string | undefined) ?? (raw.room as string | undefined),
    teacher: (raw.lecturer as string | undefined) ?? (raw.teacher as string | undefined),
    type: [date, raw.kindOfWork ?? raw.type].filter(Boolean).join(" · ") || undefined,
  };
}

function mapGrade(raw: Record<string, unknown>): GradeItem {
  return {
    id: String(raw.id),
    subject: String(raw.discipline ?? raw.subject ?? ""),
    value: String(raw.grade ?? raw.value ?? ""),
    date: String(raw.semester ?? raw.date ?? ""),
    kind: (raw.gradeType as string | undefined) ?? (raw.kind as string | undefined),
  };
}

function mapRequest(raw: Record<string, unknown>): ServiceRequest {
  const student = raw.student as { fullName?: string } | undefined;
  const profile = raw.studentProfile as { fullName?: string } | undefined;
  return {
    id: String(raw.id),
    type: String(raw.type ?? ""),
    subject: String(raw.title ?? raw.subject ?? ""),
    body: String(raw.body ?? ""),
    status: mapStatus(String(raw.status ?? "SUBMITTED")),
    createdAt: String(raw.createdAt ?? ""),
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
    studentName: student?.fullName ?? profile?.fullName,
  };
}

function mapNotification(raw: Record<string, unknown>): NotificationItem {
  return {
    id: String(raw.id),
    title: String(raw.title ?? ""),
    body: String(raw.body ?? ""),
    createdAt: String(raw.createdAt ?? ""),
    read: Boolean(raw.readAt ?? raw.read),
  };
}

type ApiAuth = {
  accessToken: string;
  user: ApiUser;
};

export async function login(email: string, password: string): Promise<AuthResponse> {
  const raw = await request<ApiAuth>("/auth/login", {
    method: "POST",
    body: { email, password },
    auth: false,
  });
  return { accessToken: raw.accessToken, user: mapUser(raw.user) };
}

export async function register(payload: {
  email: string;
  password: string;
  fullName: string;
}): Promise<AuthResponse> {
  const raw = await request<ApiAuth>("/auth/register", {
    method: "POST",
    body: payload,
    auth: false,
  });
  return { accessToken: raw.accessToken, user: mapUser(raw.user) };
}

export async function fetchMe(): Promise<User> {
  const raw = await request<ApiUser>("/auth/me");
  return mapUser(raw);
}

export type ScheduleGroup = {
  groupRuzId: string;
  groupLabel: string;
};

export async function fetchScheduleGroups(): Promise<ScheduleGroup[]> {
  const data = await request<ScheduleGroup[]>("/schedule/groups");
  return Array.isArray(data) ? data : [];
}

export async function updateProfile(payload: {
  fullName?: string;
  faculty?: string;
  program?: string;
  course?: number;
  groupLabel?: string;
  groupRuzId?: string;
  phone?: string;
  department?: string;
}): Promise<User> {
  const raw = await request<ApiUser>("/auth/me", {
    method: "PATCH",
    body: payload,
  });
  return mapUser(raw);
}

export async function fetchToday(): Promise<TodayHub> {
  const raw = await request<{
    schedule?: Record<string, unknown>[];
    lessons?: Record<string, unknown>[];
    openRequests?: unknown[];
    unreadNotifications?: unknown[];
    academicRisk?: { debts?: Record<string, unknown>[] };
  }>("/today/me");

  const lessons = (raw.lessons ?? raw.schedule ?? []).map(mapLesson);
  const debts = (raw.academicRisk?.debts ?? []).map(mapGrade);

  return {
    nextLesson: lessons[0] ?? null,
    openRequests: Array.isArray(raw.openRequests) ? raw.openRequests.length : 0,
    unreadNotifications: Array.isArray(raw.unreadNotifications)
      ? raw.unreadNotifications.length
      : 0,
    recentGrades: debts.slice(0, 5),
  };
}

function weekBounds(): { from: string; to: string } {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { from: iso(monday), to: iso(sunday) };
}

export async function fetchSchedule(from?: string, to?: string): Promise<ScheduleItem[]> {
  const bounds = weekBounds();
  const params = new URLSearchParams({
    from: from ?? bounds.from,
    to: to ?? bounds.to,
  });
  const data = await request<Record<string, unknown>[] | { lessons: Record<string, unknown>[] }>(
    `/schedule/me?${params.toString()}`,
  );
  const list = Array.isArray(data) ? data : (data.lessons ?? []);
  return list.map(mapLesson);
}

export async function fetchGrades(): Promise<GradeItem[]> {
  const data = await request<Record<string, unknown>[]>("/grades/me");
  return Array.isArray(data) ? data.map(mapGrade) : [];
}

export async function fetchRequests(): Promise<ServiceRequest[]> {
  const data = await request<Record<string, unknown>[]>("/requests");
  return Array.isArray(data) ? data.map(mapRequest) : [];
}

export async function createRequest(payload: {
  type: string;
  subject: string;
  body: string;
}): Promise<ServiceRequest> {
  const raw = await request<Record<string, unknown>>("/requests", {
    method: "POST",
    body: {
      type: payload.type,
      title: payload.subject,
      body: payload.body,
    },
  });
  return mapRequest(raw);
}

export async function draftRequestWithAi(payload: {
  type: string;
  subject: string;
  notes?: string;
}): Promise<{ draft: string; source: "zcode" | "stub"; disclaimer?: string }> {
  const context = [payload.subject, payload.notes].filter(Boolean).join(". ");
  const raw = await request<{
    draft: string;
    source?: "zcode" | "stub";
    disclaimer?: string;
  }>("/ai/draft-request", {
    method: "POST",
    body: {
      type: payload.type,
      context: context || undefined,
    },
  });
  return {
    draft: raw.draft,
    source: raw.source === "stub" ? "stub" : "zcode",
    disclaimer: raw.disclaimer,
  };
}

export async function fetchNotifications(): Promise<NotificationItem[]> {
  const data = await request<Record<string, unknown>[]>("/notifications/me");
  return Array.isArray(data) ? data.map(mapNotification) : [];
}

export async function fetchStaffRequests(): Promise<ServiceRequest[]> {
  const data = await request<Record<string, unknown>[]>("/staff/requests");
  return Array.isArray(data) ? data.map(mapRequest) : [];
}

export async function updateRequestStatus(
  id: string,
  status: ServiceRequest["status"],
): Promise<ServiceRequest> {
  const raw = await request<Record<string, unknown>>(`/staff/requests/${id}`, {
    method: "PATCH",
    body: { status: toApiStatus(status) },
  });
  return mapRequest(raw);
}
