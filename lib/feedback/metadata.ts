/**
 * Environment snapshot, taken at the moment the sheet opens.
 *
 * Everything here is read once and frozen into the report. Reading it later
 * would describe wherever the user has since navigated, not where they were
 * when something went wrong.
 *
 * This module holds no React — it takes the pathname as an argument.
 */

import {
  APP_VERSION_OR_NULL,
  resolveEnvironment,
} from './config';
import { readErrorBuffer } from './error-buffer';
import type { FeedbackMetadata, FeedbackTrack } from './types';

// ─── ids ──────────────────────────────────────────────────────────────────

function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // randomUUID needs a secure context; getRandomValues doesn't. Same v4 shape.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex: string[] = [];
  for (let i = 0; i < bytes.length; i++) {
    hex.push(bytes[i].toString(16).padStart(2, '0'));
  }
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-');
}

// ─── route ────────────────────────────────────────────────────────────────

/**
 * Query params can carry kinloom ids, so they never reach the payload.
 * usePathname() is already query-free; this is belt-and-braces for any
 * caller that passes a fuller URL.
 */
export function stripQuery(pathname: string): string {
  return pathname.split(/[?#]/)[0] || '/';
}

/**
 * Every dynamic route in the app, longest-first so a more specific pattern
 * wins. `surface` is the templated form — safe to group by, and free of the
 * ids that the raw route still contains.
 */
const DYNAMIC_ROUTES: Array<{ prefix: string; template: string; depth: number }> = [
  { prefix: '/legacy-bank/history/', template: '/legacy-bank/history/[conversation]', depth: 3 },
  { prefix: '/legacy-bank/', template: '/legacy-bank/[memberId]', depth: 2 },
  { prefix: '/library/', template: '/library/[id]', depth: 2 },
  { prefix: '/family/', template: '/family/[memberId]', depth: 2 },
  { prefix: '/create/', template: '/create/[type]', depth: 2 },
  { prefix: '/invite/', template: '/invite/[token]', depth: 2 },
];

/** Static routes that live under a prefix that is otherwise dynamic. */
const STATIC_EXCEPTIONS = new Set([
  '/create/talk',
  '/create/import',
  '/create/type-grid',
  '/family/feed',
  '/family/members',
  '/family/tree',
  '/legacy-bank/chat',
  '/legacy-bank/history',
]);

export function toSurface(route: string): string {
  if (STATIC_EXCEPTIONS.has(route)) return route;
  for (const { prefix, template, depth } of DYNAMIC_ROUTES) {
    if (route.startsWith(prefix) && route.split('/').length - 1 === depth) {
      return template;
    }
  }
  return route;
}

/**
 * Which creation track the user is in, if any. Mirrors the four modes in
 * app/(app)/create/page.tsx. 'record' has no route yet, so it is never
 * inferred — it exists in the contract for when that track ships.
 */
export function toActiveTrack(route: string): FeedbackTrack | null {
  if (route === '/create/talk') return 'talk';
  if (route === '/create/import') return 'import';
  if (route === '/create/type-grid') return 'write';
  // /create/<type> is the compose page; /create itself is just the chooser.
  if (route.startsWith('/create/')) return 'write';
  return null;
}

// ─── client facts ─────────────────────────────────────────────────────────

function detectOs(userAgent: string): string | null {
  if (/Windows NT/.test(userAgent)) return 'Windows';
  if (/iPhone|iPad|iPod/.test(userAgent)) return 'iOS';
  if (/Android/.test(userAgent)) return 'Android';
  if (/Mac OS X/.test(userAgent)) return 'macOS';
  if (/CrOS/.test(userAgent)) return 'ChromeOS';
  if (/Linux/.test(userAgent)) return 'Linux';
  return null;
}

function safeTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}

// ─── the snapshot ─────────────────────────────────────────────────────────

export function collectMetadata(pathname: string): FeedbackMetadata {
  const route = stripQuery(pathname);
  const userAgent =
    typeof navigator !== 'undefined' ? navigator.userAgent : null;

  return {
    id: uuid(),
    correlation_id: uuid(),
    environment: resolveEnvironment(),
    app_version: APP_VERSION_OR_NULL,
    route,
    surface: toSurface(route),
    user_agent: userAgent,
    viewport:
      typeof window !== 'undefined'
        ? `${window.innerWidth}x${window.innerHeight}`
        : null,
    os: userAgent ? detectOs(userAgent) : null,
    locale:
      typeof navigator !== 'undefined' ? navigator.language ?? null : null,
    timezone: safeTimezone(),
    active_track: toActiveTrack(route),
    // No session identifier exists for the Talk or Import tracks — they
    // persist message arrays and nothing else. Until one is minted upstream
    // this is null on every report. Reported in the UI-0 audit.
    active_agent_session_id: null,
    client_errors: readErrorBuffer(),
  };
}
