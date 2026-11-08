import { getToken, clearSession } from "./auth";
import type {
  AuthResponse,
  GradeItem,
  NotificationItem,
  ScheduleItem,
  ServiceRequest,
  TodayHub,
  User,
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
  } catch (err) {
    const reason = err instanceof Error ? err.message : "network error";
    throw new ApiError(
      `API недоступен (${API_URL}). Проверьте NEXT_PUBLIC_API_URL и что бэкенд запущен. ${reason}`,
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
          ? ((data as { message: string[] }).message).join(", ")
          : String((data as { message: string }).message)
        : `Ошибка API: ${response.status} ${response.statusText}`;
    throw new ApiError(message, response.status);
  }

  return data as T;
}

export function getApiBaseUrl(): string {
  return API_URL;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: { email, password },
    auth: false,
  });
}

export async function register(payload: {
  email: string;
  password: string;
  fullName: string;
}): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/register", {
    method: "POST",
    body: payload,
    auth: false,
  });
}

export async function fetchMe(): Promise<User> {
  return request<User>("/auth/me");
}

export async function fetchToday(): Promise<TodayHub> {
  return request<TodayHub>("/today");
}

export async function fetchSchedule(from?: string, to?: string): Promise<ScheduleItem[]> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString();
  return request<ScheduleItem[]>(`/schedule${qs ? `?${qs}` : ""}`);
}

export async function fetchGrades(): Promise<GradeItem[]> {
  return request<GradeItem[]>("/grades");
}

export async function fetchRequests(): Promise<ServiceRequest[]> {
  return request<ServiceRequest[]>("/requests");
}

export async function createRequest(payload: {
  type: string;
  subject: string;
  body: string;
}): Promise<ServiceRequest> {
  return request<ServiceRequest>("/requests", {
    method: "POST",
    body: payload,
  });
}

export async function draftRequestWithAi(payload: {
  type: string;
  subject: string;
  notes?: string;
}): Promise<{ draft: string }> {
  return request<{ draft: string }>("/ai/draft-request", {
    method: "POST",
    body: payload,
  });
}

export async function fetchNotifications(): Promise<NotificationItem[]> {
  return request<NotificationItem[]>("/notifications");
}

export async function fetchStaffRequests(): Promise<ServiceRequest[]> {
  return request<ServiceRequest[]>("/staff/requests");
}

export async function updateRequestStatus(
  id: string,
  status: ServiceRequest["status"],
): Promise<ServiceRequest> {
  return request<ServiceRequest>(`/staff/requests/${id}`, {
    method: "PATCH",
    body: { status },
  });
}
