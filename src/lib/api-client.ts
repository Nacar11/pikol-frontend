import { generateRequestId } from '@/lib/request-id';

/** Any non-2xx response. `body` is the parsed error envelope when there is one. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(`API request failed with status ${status}`);
    this.name = 'ApiError';
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type Params = Record<string, string | number | boolean | undefined>;

export type RequestOptions = {
  params?: Params;
  body?: unknown;
  /** Skip the refresh-on-401 retry — for login, refresh, and other auth calls. */
  skipRefresh?: boolean;
  signal?: AbortSignal;
};

/**
 * The single HTTP entry point. Feature-agnostic: the access token and the
 * refresh handler are INJECTED by AuthProvider, so lib/ never imports a
 * feature.
 *
 * On a 401 it refreshes and retries once. Refreshes are SINGLE-FLIGHT: the
 * backend rotates refresh tokens and revokes every session of a user when an
 * old one is replayed, so ten parallel 401s must share one refresh call or
 * the user is logged out everywhere.
 */
export class ApiClient {
  private accessToken: string | null = null;
  private refreshHandler: (() => Promise<string>) | null = null;
  private refreshInFlight: Promise<string> | null = null;
  private venueProvider: (() => number | null) | null = null;
  private readonly baseUrl: string;

  constructor(opts: { baseUrl: string }) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, '');
  }

  setAccessToken(token: string | null): void {
    this.accessToken = token;
  }

  setRefreshHandler(fn: (() => Promise<string>) | null): void {
    this.refreshHandler = fn;
  }

  /**
   * The venue a staff request acts at, sent as `X-Venue-ID` (ADR 0003): the
   * server authorises against the caller's groups AT that venue. Injected by
   * the staff console, read per request — so lib/ never imports a feature.
   */
  setVenueProvider(fn: (() => number | null) | null): void {
    this.venueProvider = fn;
  }

  get<T = unknown>(path: string, opts?: RequestOptions): Promise<T> {
    return this.request<T>('GET', path, opts);
  }

  post<T = unknown>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> {
    return this.request<T>('POST', path, { ...opts, body });
  }

  /** Replaces a whole resource, e.g. a group's permission set. */
  put<T = unknown>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> {
    return this.request<T>('PUT', path, { ...opts, body });
  }

  patch<T = unknown>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> {
    return this.request<T>('PATCH', path, { ...opts, body });
  }

  delete<T = unknown>(path: string, opts?: RequestOptions): Promise<T> {
    return this.request<T>('DELETE', path, opts);
  }

  async request<T>(method: Method, path: string, opts: RequestOptions = {}): Promise<T> {
    const url = this.buildUrl(path, opts.params);
    const init: RequestInit = { method, headers: this.headers(), signal: opts.signal };
    if (opts.body !== undefined && method !== 'GET') init.body = JSON.stringify(opts.body);

    let response = await fetch(url, init);

    if (response.status === 401 && !opts.skipRefresh && this.refreshHandler) {
      let token: string;
      try {
        token = await this.runRefresh();
      } catch {
        // AuthProvider has already signed the user out.
        throw new ApiError(401, null);
      }
      response = await fetch(url, { ...init, headers: this.headers(token) });
    }

    return this.handle<T>(response);
  }

  private runRefresh(): Promise<string> {
    if (this.refreshInFlight) return this.refreshInFlight;
    const handler = this.refreshHandler;
    if (!handler) return Promise.reject(new Error('no refresh handler'));
    this.refreshInFlight = (async () => {
      try {
        const token = await handler();
        this.accessToken = token;
        return token;
      } finally {
        this.refreshInFlight = null;
      }
    })();
    return this.refreshInFlight;
  }

  private headers(tokenOverride?: string): Headers {
    const h = new Headers();
    h.set('Accept', 'application/json');
    h.set('Content-Type', 'application/json');
    h.set('X-Request-ID', generateRequestId());
    const token = tokenOverride ?? this.accessToken;
    if (token) h.set('Authorization', `Bearer ${token}`);
    const venueId = this.venueProvider?.() ?? null;
    if (venueId !== null) h.set('X-Venue-ID', String(venueId));
    return h;
  }

  private buildUrl(path: string, params?: Params): string {
    const base = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    if (!params) return base;
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') qs.set(key, String(value));
    }
    const tail = qs.toString();
    return tail ? `${base}?${tail}` : base;
  }

  private async handle<T>(response: Response): Promise<T> {
    if (response.status === 204) return undefined as T;
    const raw = await response.text();
    let body: unknown = null;
    if (raw.length > 0) {
      try {
        body = JSON.parse(raw);
      } catch {
        body = raw; // a proxy's HTML 502, say
      }
    }
    if (!response.ok) throw new ApiError(response.status, body);
    return body as T;
  }
}

let singleton: ApiClient | null = null;

/**
 * The app's client. In dev the base URL falls back to the local backend; a
 * production build cannot reach here without NEXT_PUBLIC_API_BASE_URL,
 * because next.config.ts refuses to build.
 */
export function apiClient(): ApiClient {
  if (!singleton) {
    singleton = new ApiClient({
      baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api/v1',
    });
  }
  return singleton;
}
