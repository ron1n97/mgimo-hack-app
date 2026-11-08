import type {
  AuthResponse,
  TodayResponse,
  ScheduleRangeResponse,
  RequestsListResponse,
} from '@dekanat/shared';

export class ApiClient {
  constructor(
    private readonly baseUrl: string,
    private token?: string,
  ) {}

  setToken(token: string | undefined): void {
    this.token = token;
  }

  private headers(): HeadersInit {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (this.token) {
      h.Authorization = `Bearer ${this.token}`;
    }
    return h;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`login failed (${res.status}): ${text}`);
    }
    return (await res.json()) as AuthResponse;
  }

  async today(): Promise<TodayResponse> {
    const res = await fetch(`${this.baseUrl}/today/me`, {
      headers: this.headers(),
    });
    if (!res.ok) {
      throw new Error(`today failed (${res.status})`);
    }
    return (await res.json()) as TodayResponse;
  }

  async schedule(): Promise<ScheduleRangeResponse> {
    const res = await fetch(`${this.baseUrl}/schedule/me`, {
      headers: this.headers(),
    });
    if (!res.ok) {
      throw new Error(`schedule failed (${res.status})`);
    }
    return (await res.json()) as ScheduleRangeResponse;
  }

  async requests(): Promise<RequestsListResponse> {
    const res = await fetch(`${this.baseUrl}/requests/me`, {
      headers: this.headers(),
    });
    if (!res.ok) {
      throw new Error(`requests failed (${res.status})`);
    }
    return (await res.json()) as RequestsListResponse;
  }
}
