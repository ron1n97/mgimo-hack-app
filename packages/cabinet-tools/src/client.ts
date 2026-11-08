export type CabinetClientOptions = {
  apiUrl: string;
  accessToken: string;
};

export class CabinetApiError extends Error {
  status: number;
  body: string;

  constructor(message: string, status: number, body: string) {
    super(message);
    this.name = 'CabinetApiError';
    this.status = status;
    this.body = body;
  }
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

export class CabinetClient {
  constructor(private readonly opts: CabinetClientOptions) {}

  private async request<T>(
    path: string,
    init: RequestInit = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      Authorization: `Bearer ${this.opts.accessToken}`,
      ...(init.headers as Record<string, string> | undefined),
    };
    if (init.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(`${this.opts.apiUrl.replace(/\/$/, '')}${path}`, {
      ...init,
      headers,
    });
    const text = await res.text();
    let data: unknown = text;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        /* keep text */
      }
    }
    if (!res.ok) {
      const msg =
        typeof data === 'object' &&
        data &&
        'message' in data
          ? JSON.stringify((data as { message: unknown }).message)
          : text || res.statusText;
      throw new CabinetApiError(msg, res.status, text);
    }
    return data as T;
  }

  getProfile() {
    return this.request('/auth/me');
  }

  getToday() {
    return this.request('/today/me');
  }

  getSchedule(from?: string, to?: string) {
    const b = weekBounds();
    const qs = new URLSearchParams({
      from: from ?? b.from,
      to: to ?? b.to,
    });
    return this.request(`/schedule/me?${qs}`);
  }

  getGrades() {
    return this.request('/grades/me');
  }

  getRequests() {
    return this.request('/requests');
  }

  getStaffRequests() {
    return this.request('/staff/requests');
  }

  createRequest(payload: { type: string; title: string; body: string }) {
    return this.request('/requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  draftRequestAi(payload: { type: string; context?: string }) {
    return this.request('/ai/draft-request', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  nextActionsAi(payload: { focus?: string }) {
    return this.request('/ai/next-actions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  explainNotificationAi(payload: {
    title: string;
    body: string;
    kind?: string;
  }) {
    return this.request('/ai/explain-notification', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  getNotifications() {
    return this.request('/notifications/me');
  }

  updateRequestStatus(payload: {
    id: string;
    status: string;
    note?: string;
  }) {
    return this.request(`/staff/requests/${payload.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: payload.status,
        note: payload.note,
      }),
    });
  }
}

export async function loginByPhone(
  apiUrl: string,
  phone: string,
  telegramId?: string,
): Promise<{ accessToken: string; user: unknown }> {
  const res = await fetch(`${apiUrl.replace(/\/$/, '')}/auth/login-phone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ phone, telegramId }),
  });
  const text = await res.text();
  let data: unknown = text;
  try {
    data = JSON.parse(text);
  } catch {
    /* */
  }
  if (!res.ok) {
    throw new CabinetApiError(
      typeof data === 'object' && data && 'message' in data
        ? String((data as { message: unknown }).message)
        : text,
      res.status,
      text,
    );
  }
  return data as { accessToken: string; user: unknown };
}

export async function loginByEmail(
  apiUrl: string,
  email: string,
  password: string,
): Promise<{ accessToken: string; user: unknown }> {
  const res = await fetch(`${apiUrl.replace(/\/$/, '')}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const text = await res.text();
  let data: unknown = text;
  try {
    data = JSON.parse(text);
  } catch {
    /* */
  }
  if (!res.ok) {
    throw new CabinetApiError(
      typeof data === 'object' && data && 'message' in data
        ? String((data as { message: unknown }).message)
        : text,
      res.status,
      text,
    );
  }
  return data as { accessToken: string; user: unknown };
}
