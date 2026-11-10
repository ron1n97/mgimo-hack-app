import { getToken, clearSession } from "./auth";
import type {
  AuthResponse,
  Club,
  ClubTag,
  DigestFeedItem,
  GradeItem,
  NotificationItem,
  RequestStatus,
  ScheduleItem,
  ServiceRequest,
  StudentInterests,
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
    preferredSubGroupOids?: string[];
    faculty?: string;
    program?: string;
    course?: number;
  } | null;
  staffProfile?: {
    fullName?: string;
    department?: string;
    scheduleGroupRuzId?: string | null;
    scheduleGroupLabel?: string | null;
  } | null;
};

function mapRole(role: string): UserRole {
  const r = role.toUpperCase();
  if (r === "ADMIN") return "admin";
  if (r === "STAFF") return "staff";
  return "student";
}

export function mapUser(raw: ApiUser): User {
  const fullName =
    raw.studentProfile?.fullName ??
    raw.staffProfile?.fullName ??
    raw.email;
  const role = mapRole(raw.role);
  const isStudent = role === "student";
  return {
    id: raw.id,
    email: raw.email,
    fullName,
    role,
    groupName: isStudent
      ? raw.studentProfile?.groupLabel
      : (raw.staffProfile?.scheduleGroupLabel ?? undefined),
    groupRuzId: isStudent
      ? (raw.studentProfile?.groupRuzId ?? undefined)
      : (raw.staffProfile?.scheduleGroupRuzId ?? undefined),
    preferredSubGroupOids: isStudent
      ? (raw.studentProfile?.preferredSubGroupOids ?? [])
      : [],
    phone: raw.phoneE164 ?? undefined,
    faculty: isStudent ? raw.studentProfile?.faculty : undefined,
    program: isStudent ? raw.studentProfile?.program : undefined,
    course: isStudent ? raw.studentProfile?.course : undefined,
    department: raw.staffProfile?.department,
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
      : dateRaw instanceof Date
        ? dateRaw.toISOString().slice(0, 10)
        : undefined;
  return {
    id: String(raw.id),
    title: String(raw.discipline ?? raw.title ?? "Занятие"),
    startTime: String(raw.begin ?? raw.startTime ?? ""),
    endTime: String(raw.end ?? raw.endTime ?? ""),
    date,
    room: (raw.auditorium as string | undefined) ?? (raw.room as string | undefined),
    teacher: (raw.lecturer as string | undefined) ?? (raw.teacher as string | undefined),
    kind: (raw.kindOfWork as string | undefined) ?? (raw.type as string | undefined),
    building: raw.building as string | undefined,
    subGroup: (raw.subGroup as string | undefined) ?? undefined,
    subGroupOid: raw.subGroupOid != null ? String(raw.subGroupOid) : undefined,
    stream: (raw.stream as string | undefined) ?? undefined,
  };
}

function mapGrade(raw: Record<string, unknown>): GradeItem {
  return {
    id: String(raw.id),
    subject: String(raw.discipline ?? raw.subject ?? ""),
    value: String(raw.grade ?? raw.value ?? ""),
    date: String(raw.semester ?? raw.date ?? ""),
    kind: (raw.gradeType as string | undefined) ?? (raw.kind as string | undefined),
    isDebt: Boolean(raw.isDebt),
  };
}

function mapRequest(raw: Record<string, unknown>): ServiceRequest {
  const student = raw.student as
    | { fullName?: string; studentProfile?: { fullName?: string } }
    | undefined;
  const profile = raw.studentProfile as { fullName?: string } | undefined;
  return {
    id: String(raw.id),
    type: String(raw.type ?? ""),
    subject: String(raw.title ?? raw.subject ?? ""),
    body: String(raw.body ?? ""),
    status: mapStatus(String(raw.status ?? "SUBMITTED")),
    createdAt: String(raw.createdAt ?? ""),
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
    studentName:
      student?.studentProfile?.fullName ??
      student?.fullName ??
      profile?.fullName,
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

export type ScheduleSubGroup = {
  subGroupOid: string;
  subGroup: string;
};

export async function fetchScheduleGroups(): Promise<ScheduleGroup[]> {
  const data = await request<ScheduleGroup[]>("/schedule/groups");
  return Array.isArray(data) ? data : [];
}

export async function fetchScheduleSubGroups(
  groupRuzId: string,
): Promise<ScheduleSubGroup[]> {
  if (!groupRuzId) return [];
  const data = await request<ScheduleSubGroup[]>(
    `/schedule/groups/${encodeURIComponent(groupRuzId)}/subgroups`,
  );
  return Array.isArray(data) ? data : [];
}

export async function updateProfile(payload: {
  fullName?: string;
  faculty?: string;
  program?: string;
  course?: number;
  groupLabel?: string;
  groupRuzId?: string;
  preferredSubGroupOids?: string[];
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
    date?: string;
    schedule?: Record<string, unknown>[];
    lessons?: Record<string, unknown>[];
    nextLesson?: Record<string, unknown> | null;
    openRequests?: unknown[];
    unreadNotifications?: unknown[];
    recentGrades?: Record<string, unknown>[];
    academicRisk?: { debts?: Record<string, unknown>[] };
  }>("/today/me");

  const lessons = (raw.lessons ?? raw.schedule ?? []).map(mapLesson);
  const recent =
    raw.recentGrades?.map(mapGrade) ??
    (raw.academicRisk?.debts ?? []).map(mapGrade);

  return {
    date: raw.date,
    lessons,
    nextLesson: raw.nextLesson ? mapLesson(raw.nextLesson) : lessons[0] ?? null,
    openRequests: Array.isArray(raw.openRequests) ? raw.openRequests.length : 0,
    unreadNotifications: Array.isArray(raw.unreadNotifications)
      ? raw.unreadNotifications.length
      : 0,
    recentGrades: recent.slice(0, 8),
  };
}

function localIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function weekBounds(): { from: string; to: string } {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(12, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { from: localIso(monday), to: localIso(sunday) };
}

export async function fetchAdminOverview(): Promise<{
  counts: {
    students: number;
    staff: number;
    admins: number;
    openTickets: number;
    debts: number;
    lessons: number;
  };
  users: Array<{
    id: string;
    email: string;
    role: string;
    phone?: string | null;
    name: string;
    meta?: string | null;
  }>;
}> {
  return request("/admin/overview");
}

export async function fetchSchedule(
  from?: string,
  to?: string,
  opts?: { showAll?: boolean },
): Promise<ScheduleItem[]> {
  const bounds = weekBounds();
  const params = new URLSearchParams({
    from: from ?? bounds.from,
    to: to ?? bounds.to,
  });
  if (opts?.showAll) params.set("showAll", "1");
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

export async function downloadRequestDocx(payload: {
  type: string;
  body: string;
  subject?: string;
}): Promise<void> {
  const token = getToken();
  const headers: Record<string, string> = {
    Accept:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_URL}/ai/export-docx`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
  } catch {
    throw new ApiError("Сервер недоступен. Проверьте интернет и попробуйте снова.", 0);
  }

  if (response.status === 401) {
    clearSession();
    if (typeof window !== "undefined" && window.location.pathname !== "/") {
      window.location.href = "/";
    }
    throw new ApiError("Нужно войти снова", 401);
  }

  if (!response.ok) {
    throw new ApiError(`Не удалось скачать Word (${response.status})`, response.status);
  }

  const blob = await response.blob();
  const cd = response.headers.get("Content-Disposition") ?? "";
  const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(cd);
  const filename = decodeURIComponent(match?.[1] || match?.[2] || "zayavlenie.docx");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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

function mapClubTag(raw: Record<string, unknown>): ClubTag {
  return {
    id: String(raw.id),
    slug: String(raw.slug ?? ""),
    name: String(raw.name ?? ""),
  };
}

function mapClub(raw: Record<string, unknown>): Club {
  const tagsRaw = Array.isArray(raw.tags) ? raw.tags : [];
  const tags = tagsRaw.map((t) => {
    const row = t as Record<string, unknown>;
    const nested = row.tag as Record<string, unknown> | undefined;
    return mapClubTag(nested ?? row);
  });
  const sourcesRaw = Array.isArray(raw.sources) ? raw.sources : [];
  return {
    id: String(raw.id),
    name: String(raw.name ?? ""),
    description: (raw.description as string | null | undefined) ?? null,
    status: String(raw.status ?? "DRAFT"),
    digestEnabled: Boolean(raw.digestEnabled),
    websiteUrl: (raw.websiteUrl as string | null | undefined) ?? null,
    structureNote: (raw.structureNote as string | null | undefined) ?? null,
    tags,
    sources: sourcesRaw.map((s) => {
      const row = s as Record<string, unknown>;
      return {
        id: String(row.id),
        kind: String(row.kind ?? "WEBSITE"),
        url: String(row.url ?? ""),
        title: (row.title as string | null | undefined) ?? null,
        enabled: Boolean(row.enabled ?? true),
      };
    }),
  };
}

export async function fetchTags(): Promise<ClubTag[]> {
  const data = await request<Record<string, unknown>[]>("/tags");
  return Array.isArray(data) ? data.map(mapClubTag) : [];
}

export async function fetchClubs(params?: {
  tag?: string;
  q?: string;
}): Promise<Club[]> {
  const qs = new URLSearchParams();
  if (params?.tag) qs.set("tag", params.tag);
  if (params?.q) qs.set("q", params.q);
  const suffix = qs.toString() ? `?${qs}` : "";
  const data = await request<Record<string, unknown>[]>(`/clubs${suffix}`);
  return Array.isArray(data) ? data.map(mapClub) : [];
}

export async function createClub(payload: {
  name: string;
  description?: string;
  tags?: string[];
  sourceUrls?: string[];
}): Promise<Club> {
  const raw = await request<Record<string, unknown>>("/clubs", {
    method: "POST",
    body: payload,
  });
  return mapClub(raw);
}

export async function fetchInterests(): Promise<StudentInterests> {
  const raw = await request<{
    tags?: Record<string, unknown>[];
    clubs?: Record<string, unknown>[];
  }>("/me/interests");
  return {
    tags: (raw.tags ?? []).map(mapClubTag),
    clubs: (raw.clubs ?? []).map(mapClub),
  };
}

export async function setInterestTags(tagIds: string[]): Promise<StudentInterests> {
  const raw = await request<{
    tags?: Record<string, unknown>[];
    clubs?: Record<string, unknown>[];
  }>("/me/interests/tags", {
    method: "PUT",
    body: { tagIds },
  });
  return {
    tags: (raw.tags ?? []).map(mapClubTag),
    clubs: (raw.clubs ?? []).map(mapClub),
  };
}

export async function subscribeClub(id: string): Promise<StudentInterests> {
  const raw = await request<{
    tags?: Record<string, unknown>[];
    clubs?: Record<string, unknown>[];
  }>(`/me/subscriptions/clubs/${id}`, { method: "POST" });
  return {
    tags: (raw.tags ?? []).map(mapClubTag),
    clubs: (raw.clubs ?? []).map(mapClub),
  };
}

export async function unsubscribeClub(id: string): Promise<StudentInterests> {
  const raw = await request<{
    tags?: Record<string, unknown>[];
    clubs?: Record<string, unknown>[];
  }>(`/me/subscriptions/clubs/${id}`, { method: "DELETE" });
  return {
    tags: (raw.tags ?? []).map(mapClubTag),
    clubs: (raw.clubs ?? []).map(mapClub),
  };
}

export async function fetchDigestFeed(
  filter?: "subscribed",
): Promise<DigestFeedItem[]> {
  const qs = filter ? `?filter=${filter}` : "";
  const raw = await request<{ items?: Record<string, unknown>[] }>(
    `/digest/feed${qs}`,
  );
  const items = Array.isArray(raw.items) ? raw.items : [];
  return items.map((row) => {
    const club = row.club as Record<string, unknown> | null | undefined;
    return {
      id: String(row.id),
      title: String(row.title ?? ""),
      body: (row.body as string | null | undefined) ?? null,
      url: (row.url as string | null | undefined) ?? null,
      startsAt: row.startsAt ? String(row.startsAt) : null,
      club: club
        ? { id: String(club.id), name: String(club.name ?? "") }
        : null,
    };
  });
}

export async function fetchStaffClubs(): Promise<Club[]> {
  return fetchClubs();
}

export async function confirmClub(
  id: string,
  digestEnabled?: boolean,
): Promise<Club> {
  const raw = await request<Record<string, unknown>>(
    `/staff/clubs/${id}/confirm`,
    {
      method: "PATCH",
      body: digestEnabled === undefined ? {} : { digestEnabled },
    },
  );
  return mapClub(raw);
}

export async function setClubDigest(
  id: string,
  digestEnabled: boolean,
): Promise<Club> {
  const raw = await request<Record<string, unknown>>(
    `/staff/clubs/${id}/digest`,
    {
      method: "PATCH",
      body: { digestEnabled },
    },
  );
  return mapClub(raw);
}

export async function addDigestSource(payload: {
  url: string;
  clubId?: string;
  title?: string;
}): Promise<unknown> {
  return request("/staff/digest-sources", {
    method: "POST",
    body: payload,
  });
}
