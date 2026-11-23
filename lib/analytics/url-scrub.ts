/**
 * Keep secrets out of the address bar (and so out of anything analytics, the
 * Referer header or browser history can read).
 *
 * The page reads its token first; then this strips it with
 * `history.replaceState`. The route map is the backstop: analytics never
 * sees a raw URL even when a token is still present.
 *
 *   /invite/<token>          → /invite
 *       middleware.ts keeps the token in an HttpOnly cookie scoped to
 *       /invite, so a refresh (or router.refresh / server actions) still
 *       works on the bare path (app/invite/page.tsx).
 *   /auth/action?mode&oobCode&apiKey&next…  → /auth/action
 *       The page stashes its params in sessionStorage (this tab only) so a
 *       refresh still works. See app/auth/action/page.tsx.
 *   ?next=/invite/<token>    → ?next=/invite   (on any page)
 *
 * HubSpot's email-click params (`_hsenc`, `_hsmi`, `utm_*`) are left alone
 * so its tracking code can attribute the visit.
 */

// Same shape middleware.ts accepts into the cookie: only strip what a refresh
// can restore. (Tokens are 64 lowercase hex characters.)
const INVITE_PATH = /^\/invite\/[A-Za-z0-9_-]{1,256}\/?$/;

function scrubNext(value: string): string {
  const cut = value.search(/[?#]/);
  const path = cut >= 0 ? value.slice(0, cut) : value;
  return INVITE_PATH.test(path) ? '/invite' : value;
}

/**
 * The scrubbed form of a same-origin URL, or null when nothing needs to change.
 * Pure: takes and returns `pathname + search + hash`.
 */
export function scrubbedPath(pathname: string, search: string, hash: string): string | null {
  let path = pathname;
  const params = new URLSearchParams(search);
  let changed = false;

  if (INVITE_PATH.test(path)) {
    path = '/invite';
    changed = true;
  }

  if (path === '/auth/action' && search) {
    // Every Firebase action param is either a secret (oobCode, apiKey) or
    // only meaningful with one. Drop them all.
    return `/auth/action${hash}`;
  }

  const next = params.get('next');
  if (next) {
    const clean = scrubNext(next);
    if (clean !== next) {
      params.set('next', clean);
      changed = true;
    }
  }

  if (!changed) return null;
  const qs = params.toString();
  return `${path}${qs ? `?${qs}` : ''}${hash}`;
}

/** True when the current URL carries something scrubPath would remove. */
export function currentUrlNeedsScrub(): boolean {
  if (typeof window === 'undefined') return false;
  const { pathname, search, hash } = window.location;
  return scrubbedPath(pathname, search, hash) !== null;
}

/**
 * Strip secrets from the current URL. Must run after Next's app router has
 * mounted (it patches history.replaceState to keep usePathname in sync), so
 * callers schedule it a task after hydration.
 */
export function scrubCurrentUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const { pathname, search, hash } = window.location;
  const clean = scrubbedPath(pathname, search, hash);
  if (clean === null) return false;
  try {
    // null state: Next copies its own internal state into the entry.
    window.history.replaceState(null, '', clean);
    return true;
  } catch {
    return false;
  }
}

// ─── /auth/action params, kept for a refresh ──────────────────────

const AUTH_ACTION_KEY = 'kl_auth_action';

export type AuthActionParams = { mode: string | null; oobCode: string | null; next: string | null };

export function stashAuthActionParams(params: AuthActionParams): void {
  try {
    sessionStorage.setItem(AUTH_ACTION_KEY, JSON.stringify(params));
  } catch {
    // Private mode / storage disabled: a refresh just shows the "missing code" page.
  }
}

export function readStashedAuthActionParams(): AuthActionParams | null {
  try {
    const raw = sessionStorage.getItem(AUTH_ACTION_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<AuthActionParams>;
    return {
      mode: typeof v.mode === 'string' ? v.mode : null,
      oobCode: typeof v.oobCode === 'string' ? v.oobCode : null,
      next: typeof v.next === 'string' ? v.next : null,
    };
  } catch {
    return null;
  }
}

export function clearStashedAuthActionParams(): void {
  try {
    sessionStorage.removeItem(AUTH_ACTION_KEY);
  } catch {
    // ignore
  }
}
