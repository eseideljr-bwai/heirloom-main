/**
 * Server-only Heirloom API fetcher.
 *
 * Used by:
 *   • Server components (page.tsx, layout.tsx)
 *   • Route handlers (app/api/*)
 *   • The catch-all BFF proxy at app/api/proxy/[...path]
 *
 * Reads the HttpOnly id_token cookie, attaches it as a Bearer header,
 * and calls the Laravel backend directly. There is no token persistence
 * on the client beyond cookies (Epic 3 prerequisite).
 */

import 'server-only';
import { cookies } from 'next/headers';
import { ApiError } from '../api';
import { COOKIES } from './cookies';

/**
 * Server-only API base. Defaults to the staging Laravel host but should
 * be set via env in any non-trivial deployment.
 */
export const SERVER_API_BASE = (
  process.env.KINLOOM_API_URL ||
  process.env.BACKEND_API_URL ||
  'https://kinloom-api-laravel-fz0wpjzb.on-forge.com/api'
).replace(/\/$/, '');

export type ServerFetchOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  /** Skip Authorization header even if a token cookie exists. */
  anonymous?: boolean;
  /**
   * Disable Next's data cache for this request. Defaults to `'no-store'`
   * because authenticated user data should never be cached across users.
   * Pass `false` to opt into the default cache when you want it.
   */
  noStore?: boolean;
};

function readToken(): string | null {
  try {
    return cookies().get(COOKIES.idToken)?.value ?? null;
  } catch {
    // `cookies()` throws when called outside a request scope (e.g.
    // during a static page evaluation). Treat as anonymous.
    return null;
  }
}

export async function serverApiFetch<T = unknown>(
  path: string,
  options: ServerFetchOptions = {},
): Promise<T> {
  const { body, anonymous, noStore = true, headers, ...rest } = options;

  const h: Record<string, string> = {
    Accept: 'application/json',
    ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...((headers as Record<string, string>) || {}),
  };
  if (!anonymous) {
    const token = readToken();
    if (token) h.Authorization = `Bearer ${token}`;
  }

  const url = path.startsWith('http') ? path : `${SERVER_API_BASE}${path}`;

  const res = await fetch(url, {
    ...rest,
    headers: h,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: noStore ? 'no-store' : rest.cache,
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

  return data as T;
}

export { ApiError };
