/**
 * Browser-side Heirloom API fetcher (Epic 1: Firebase-backed).
 *
 *   Browser  →  /api/proxy/<...>  (BFF, same origin)
 *           →  attaches Bearer from the kinloom_id_token cookie
 *           →  forwards to Laravel
 *
 * The browser does NOT touch Firebase here on purpose: keeping this
 * module free of any Firebase Web SDK imports lets server code import
 * `ApiError` / `apiFetch` without dragging the SDK into the SSR
 * bundle. Token refresh is driven by `onIdTokenChanged` in
 * lib/auth-context.tsx, which re-posts the fresh ID token to
 * /api/auth/session and the cookie stays current.
 *
 * Server components and route handlers should use `serverApiFetch`
 * from lib/server/api.ts.
 */

export const API_BASE = '/api/proxy';

const SESSION_STARTED_AT_COOKIE = 'kinloom_session_started_at';
const LAST_ACTIVITY_KEY = 'kinloom.last_activity_at';

// Epic 2: idle 24h, absolute 30d.
export const IDLE_TIMEOUT_MS = 24 * 60 * 60 * 1000;
export const ABSOLUTE_TIMEOUT_MS = 30 * 24 * 60 * 60 * 1000;

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
  firstFieldError(): string | undefined {
    if (!this.errors) return undefined;
    const first = Object.values(this.errors)[0];
    return Array.isArray(first) ? first[0] : undefined;
  }
}

// ─── Session timestamps (client-side idle/absolute watchdog) ──────

function isBrowser() {
  return typeof window !== 'undefined';
}

function readCookie(name: string): string | null {
  if (!isBrowser()) return null;
  const match = document.cookie.split('; ').find(c => c.startsWith(`${name}=`));
  if (!match) return null;
  const value = match.slice(name.length + 1);
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function getSessionStartedAt(): number | null {
  const raw = readCookie(SESSION_STARTED_AT_COOKIE);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function getLastActivityAt(): number | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(LAST_ACTIVITY_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function touchActivity(now: number = Date.now()) {
  if (!isBrowser()) return;
  window.localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
}

export type SessionStatus =
  | 'active'
  | 'no_session'
  | 'idle_expired'
  | 'absolute_expired';

/**
 * Session-presence proxy. The Firebase session cookie is HttpOnly so
 * the client can't read it directly; `session_started_at` (set by the
 * server when the session cookie is minted) doubles as a probe.
 */
export function checkSessionStatus(now: number = Date.now()): SessionStatus {
  const startedAt = getSessionStartedAt();
  if (startedAt == null) return 'no_session';
  if (now - startedAt > ABSOLUTE_TIMEOUT_MS) return 'absolute_expired';
  const lastAt = getLastActivityAt();
  if (lastAt != null && now - lastAt > IDLE_TIMEOUT_MS) return 'idle_expired';
  return 'active';
}

// ─── Core fetch ────────────────────────────────────────────────────

export type ApiFetchOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  /** Skip Authorization handling (the BFF still won't attach a Bearer). */
  anonymous?: boolean;
};

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { body, anonymous, headers, ...rest } = options;

  const h: Record<string, string> = {
    Accept: 'application/json',
    ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...((headers as Record<string, string>) || {}),
  };
  if (anonymous) {
    // Hint to the BFF that no Bearer should be attached.
    h['X-Kinloom-Anonymous'] = '1';
  }

  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;

  const res = await fetch(url, {
    ...rest,
    headers: h,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });

  if (res.status === 204) return undefined as T;

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
      data && typeof data === 'object' && 'message' in data && typeof (data as { message: unknown }).message === 'string'
        ? (data as { message: string }).message
        : `Request failed (${res.status})`;
    throw new ApiError(res.status, message, data);
  }

  if (!anonymous) touchActivity();
  return data as T;
}
