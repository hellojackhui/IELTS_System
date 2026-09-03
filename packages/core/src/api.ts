import type {
  AuthResponse,
  SyncPullResponse,
  SyncPushResponse,
  WordProgress,
} from './types';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  /** Returns the current auth token, or null when signed out. */
  getToken?: () => string | null | Promise<string | null>;
}

/** Thin fetch wrapper for the sync server. Framework-agnostic; used by web and native. */
export class ApiClient {
  private baseUrl: string;
  private getToken?: ApiClientOptions['getToken'];

  constructor(opts: ApiClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, '');
    this.getToken = opts.getToken;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('Content-Type', 'application/json');
    const token = this.getToken ? await this.getToken() : null;
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const res = await fetch(`${this.baseUrl}${path}`, { ...init, headers });
    const text = await res.text();
    const body = text ? JSON.parse(text) : {};
    if (!res.ok) {
      throw new ApiError(res.status, body?.error ?? res.statusText);
    }
    return body as T;
  }

  register(email: string, password: string): Promise<AuthResponse> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  login(email: string, password: string): Promise<AuthResponse> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  pull(since = 0): Promise<SyncPullResponse> {
    return this.request(`/sync/pull?since=${since}`);
  }

  push(changes: WordProgress[]): Promise<SyncPushResponse> {
    return this.request('/sync/push', {
      method: 'POST',
      body: JSON.stringify({ changes }),
    });
  }
}
