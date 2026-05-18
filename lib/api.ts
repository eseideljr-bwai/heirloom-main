/**
 * Thin fetch wrapper around the Heirloom API.
 *
 * - Persists `id_token` + `refresh_token` in localStorage.
 * - Auto-attaches `Authorization: Bearer <id_token>` on every request.
 * - On 401, transparently calls `/auth/refresh` once and retries.
 *
 * NOTE: localStorage is intentional for now (matches Firebase's prior
 * client-side persistence). Move to httpOnly cookies if/when we add SSR
 * data fetching that needs auth.
 */

/**
 * Defaults to `/proxy` so requests are same-origin and routed through the
 * Next.js rewrite in `next.config.mjs` → bypasses CORS. Set
 * `NEXT_PUBLIC_API_URL` to hit the backend directly (CORS must be configured).
 */
export const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || '/proxy'
);

const ID_TOKEN_KEY = 'heirloom.id_token';
const REFRESH_TOKEN_KEY = 'heirloom.refresh_token';
const EXPIRES_AT_KEY = 'heirloom.expires_at';
/** Wall-clock ms when this session was first established (login/register). */
const SESSION_STARTED_AT_KEY = 'heirloom.session_started_at';
/** Wall-clock ms of last user activity (mouse/keyboard/api call). */
const LAST_ACTIVITY_AT_KEY = 'heirloom.last_activity_at';
/** Cookie read by next.js middleware to gate protected routes server-side. */
const SESSION_COOKIE = 'kinloom_session';

// Epic 2: idle 24h, absolute 30d.
export const IDLE_TIMEOUT_MS = 24 * 60 * 60 * 1000;
export const ABSOLUTE_TIMEOUT_MS = 30 * 24 * 60 * 60 * 1000;

// ─── Token storage ─────────────────────────────────────────────────

export type AuthTokens = {
  id_token: string;
  refresh_token: string;
  expires_in: number;
};

function isBrowser() {
  return typeof window !== 'undefined';
}

function setSessionCookie(maxAgeSeconds: number) {
  if (!isBrowser()) return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${SESSION_COOKIE}=1; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

function clearSessionCookie() {
  if (!isBrowser()) return;
  document.cookie = `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function getIdToken(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(ID_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function saveTokens(t: AuthTokens) {
  if (!isBrowser()) return;
  window.localStorage.setItem(ID_TOKEN_KEY, t.id_token);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, t.refresh_token);
  window.localStorage.setItem(
    EXPIRES_AT_KEY,
    String(Date.now() + t.expires_in * 1000),
  );
  if (!window.localStorage.getItem(SESSION_STARTED_AT_KEY)) {
    window.localStorage.setItem(SESSION_STARTED_AT_KEY, String(Date.now()));
  }
  touchActivity();
  // Session cookie lives for the absolute timeout window; the client still
  // enforces idle 24h on top of this.
  setSessionCookie(Math.floor(ABSOLUTE_TIMEOUT_MS / 1000));
}

export function clearTokens() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(ID_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(EXPIRES_AT_KEY);
  window.localStorage.removeItem(SESSION_STARTED_AT_KEY);
  window.localStorage.removeItem(LAST_ACTIVITY_AT_KEY);
  clearSessionCookie();
}

// ─── Session timestamps ────────────────────────────────────────────

export function touchActivity(now: number = Date.now()) {
  if (!isBrowser()) return;
  window.localStorage.setItem(LAST_ACTIVITY_AT_KEY, String(now));
}

function readTs(key: string): number | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function getSessionStartedAt(): number | null {
  return readTs(SESSION_STARTED_AT_KEY);
}

export function getLastActivityAt(): number | null {
  return readTs(LAST_ACTIVITY_AT_KEY);
}

export type SessionStatus =
  | 'active'
  | 'no_session'
  | 'idle_expired'
  | 'absolute_expired';

/**
 * Pure check (no side-effects). Returns why the session is no longer
 * valid so callers can decide whether to surface a message.
 */
export function checkSessionStatus(now: number = Date.now()): SessionStatus {
  if (!getIdToken()) return 'no_session';
  const startedAt = getSessionStartedAt();
  if (startedAt != null && now - startedAt > ABSOLUTE_TIMEOUT_MS) {
    return 'absolute_expired';
  }
  const lastAt = getLastActivityAt();
  if (lastAt != null && now - lastAt > IDLE_TIMEOUT_MS) {
    return 'idle_expired';
  }
  return 'active';
}

// ─── Errors ────────────────────────────────────────────────────────

export type ValidationErrors = Record<string, string[]>;

export class ApiError extends Error {
  status: number;
  body: unknown;
  errors?: ValidationErrors;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
    if (body && typeof body === 'object' && 'errors' in body) {
      this.errors = (body as { errors?: ValidationErrors }).errors;
    }
  }
  /** First validation error message, if any. */
  firstFieldError(): string | undefined {
    if (!this.errors) return undefined;
    const first = Object.values(this.errors)[0];
    return Array.isArray(first) ? first[0] : undefined;
  }
}

// ─── Refresh handling ──────────────────────────────────────────────

let refreshInFlight: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  const refresh_token = getRefreshToken();
  if (!refresh_token) return false;

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refresh_token }),
      });
      if (!res.ok) {
        clearTokens();
        return false;
      }
      const data: AuthTokens = await res.json();
      saveTokens(data);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

// ─── Core fetch ────────────────────────────────────────────────────

export type ApiFetchOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  /** Skip Authorization header even if a token exists. */
  anonymous?: boolean;
  /** Skip the auto-refresh-and-retry on 401. */
  noRetry?: boolean;
};

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { body, anonymous, noRetry, headers, ...rest } = options;

  const buildHeaders = (): HeadersInit => {
    const h: Record<string, string> = {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...((headers as Record<string, string>) || {}),
    };
    if (!anonymous) {
      const token = getIdToken();
      if (token) h.Authorization = `Bearer ${token}`;
    }
    return h;
  };

  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;

  const doRequest = () =>
    fetch(url, {
      ...rest,
      headers: buildHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let res = await doRequest();

  if (res.status === 401 && !anonymous && !noRetry) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      res = await doRequest();
    }
  }

  if (res.status === 204) {
    return undefined as T;
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
      (data &&
        typeof data === 'object' &&
        'message' in data &&
        typeof (data as { message: unknown }).message === 'string'
        ? (data as { message: string }).message
        : `Request failed (${res.status})`);
    throw new ApiError(res.status, message, data);
  }

  if (!anonymous) touchActivity();
  return data as T;
}
