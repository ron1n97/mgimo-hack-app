import Constants from 'expo-constants';
import type {
  AuthResponse,
  CreateRequestDto,
  GradeDto,
  NotificationDto,
  RequestTicketDto,
  ScheduleLessonDto,
  TodayResponse,
} from '@dekanat/shared';

function resolveApiUrl(): string {
  const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;
  return (
    process.env.EXPO_PUBLIC_API_URL ??
    extra?.apiUrl ??
    'http://localhost:3001'
  );
}

export const API_URL = resolveApiUrl();

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type RequestInitAuth = {
  method?: string;
  body?: unknown;
  token?: string | null;
};

async function request<T>(path: string, options: RequestInitAuth = {}): Promise<T> {
  const { method = 'GET', body, token } = options;
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Сервер недоступен. Проверьте интернет и попробуйте снова.', 0);
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const message =
      typeof data === 'object' &&
      data !== null &&
      'message' in data &&
      (typeof (data as { message: unknown }).message === 'string' ||
        Array.isArray((data as { message: unknown }).message))
        ? Array.isArray((data as { message: unknown }).message)
          ? (data as { message: string[] }).message.join(', ')
          : String((data as { message: string }).message)
        : text || `HTTP ${res.status}`;
    throw new ApiError(message, res.status);
  }

  return data as T;
}

export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

/** Nest returns `schedule`; shared schema uses `lessons` — normalize. */
type TodayApiRaw = {
  date: string;
  lessons?: ScheduleLessonDto[];
  schedule?: ScheduleLessonDto[];
  openRequests?: RequestTicketDto[];
  unreadNotifications?: NotificationDto[];
  debts?: GradeDto[];
  academicRisk?: { debts?: GradeDto[] };
  summary?: string;
  disclaimer?: string;
};

export async function fetchToday(token: string): Promise<TodayResponse> {
  const raw = await request<TodayApiRaw>('/today/me', { token });
  return {
    date: raw.date,
    lessons: raw.lessons ?? raw.schedule ?? [],
    openRequests: raw.openRequests ?? [],
    unreadNotifications: raw.unreadNotifications ?? [],
    debts: raw.debts ?? raw.academicRisk?.debts ?? [],
    summary: raw.summary ?? raw.disclaimer,
  };
}

export async function fetchSchedule(
  token: string,
  from: string,
  to: string,
): Promise<ScheduleLessonDto[]> {
  const qs = new URLSearchParams({ from, to });
  const data = await request<ScheduleLessonDto[] | { lessons: ScheduleLessonDto[] }>(
    `/schedule/me?${qs.toString()}`,
    { token },
  );
  return Array.isArray(data) ? data : (data.lessons ?? []);
}

export async function fetchGrades(token: string): Promise<GradeDto[]> {
  const data = await request<GradeDto[]>('/grades/me', { token });
  return Array.isArray(data) ? data : [];
}

export async function fetchRequests(token: string): Promise<RequestTicketDto[]> {
  const data = await request<RequestTicketDto[] | { items: RequestTicketDto[] }>(
    '/requests',
    { token },
  );
  return Array.isArray(data) ? data : (data.items ?? []);
}

export async function createRequest(
  token: string,
  payload: CreateRequestDto,
): Promise<RequestTicketDto> {
  return request<RequestTicketDto>('/requests', {
    method: 'POST',
    token,
    body: payload,
  });
}

export async function fetchNotifications(
  token: string,
): Promise<NotificationDto[]> {
  const data = await request<NotificationDto[]>('/notifications/me', { token });
  return Array.isArray(data) ? data : [];
}
