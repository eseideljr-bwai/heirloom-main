'use client';

/**
 * Client-side auth state.
 *
 * Post-Epic-3:
 *   - `initialUser` is provided by the server root layout, so first paint
 *     is always correct without a /me round-trip.
 *   - Tokens live in HttpOnly cookies and never touch JS. The client
 *     can't read them; we use the non-HttpOnly `kinloom_session_started_at`
 *     cookie as a "session exists" probe for the idle/absolute watchdog.
 *   - Login/register/logout go through the Next.js BFF (`/api/auth/*`),
 *     which sets/clears the cookies and returns the user payload.
 *   - Idle 24h + absolute 30d are still enforced client-side; on expiry
 *     we hit /api/auth/logout (clears cookies) and bounce to `/`.
 *   - Multi-tab sync via BroadcastChannel (storage events can't see
 *     HttpOnly cookies).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  AuthUser,
  RegisterPayload,
  getMe,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
} from './auth';
import {
  ABSOLUTE_TIMEOUT_MS,
  checkSessionStatus,
  getSessionStartedAt,
  IDLE_TIMEOUT_MS,
  touchActivity,
} from './api';

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (payload: RegisterPayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Server-rendered initial user. Passed by the root layout (server
 * component) so the very first paint already has the right `user` and
 * no /me round-trip is needed on cold starts.
 */
export type AuthProviderProps = {
  children: React.ReactNode;
  initialUser?: AuthUser | null;
};

export function AuthProvider({ children, initialUser = null }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  // No loading state on cold start anymore — server already resolved the
  // user. `loading` is only here for backwards-compat with callers that
  // gate on it; it stays `false`.
  const [loading] = useState(false);

  const refresh = useCallback(async () => {
    if (!getSessionStartedAt()) {
      setUser(null);
      return;
    }
    try {
      const me = await getMe();
      setUser(me);
    } catch {
      setUser(null);
    }
  }, []);

  const broadcast = useCallback((msg: 'login' | 'logout') => {
    if (typeof BroadcastChannel === 'undefined') return;
    try {
      const bc = new BroadcastChannel('kinloom_auth');
      bc.postMessage(msg);
      bc.close();
    } catch {
      // ignore
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const u = await apiLogin(email, password);
    setUser(u);
    broadcast('login');
    return u;
  }, [broadcast]);

  const register = useCallback(async (payload: RegisterPayload) => {
    const u = await apiRegister(payload);
    setUser(u);
    broadcast('login');
    return u;
  }, [broadcast]);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    broadcast('logout');
  }, [broadcast]);

  // ─── Activity tracking (idle 24h) ───────────────────────────────
  // Debounced: at most one localStorage write per ACTIVITY_THROTTLE_MS.
  const lastWriteRef = useRef(0);
  useEffect(() => {
    if (!user) return;
    const ACTIVITY_THROTTLE_MS = 30_000;
    const onActivity = () => {
      const now = Date.now();
      if (now - lastWriteRef.current < ACTIVITY_THROTTLE_MS) return;
      lastWriteRef.current = now;
      touchActivity(now);
    };
    // First touch on mount so an active tab doesn't get killed by an
    // ancient last-activity timestamp from a previous session.
    onActivity();
    const events: (keyof DocumentEventMap)[] = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'visibilitychange',
    ];
    for (const e of events) document.addEventListener(e, onActivity, { passive: true });
    return () => {
      for (const e of events) document.removeEventListener(e, onActivity);
    };
  }, [user]);

  // ─── Expiry watchdog (idle 24h + absolute 30d) ─────────────────
  useEffect(() => {
    if (!user) return;
    const tick = () => {
      const status = checkSessionStatus();
      if (status === 'idle_expired' || status === 'absolute_expired') {
        logout();
        if (typeof window !== 'undefined') {
          window.location.replace('/?reason=session_expired');
        }
      }
    };
    tick();
    const id = window.setInterval(tick, 60_000);
    // Also re-check immediately when the tab becomes visible — covers
    // laptops closed past the timeout.
    const onVis = () => tick();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [user, logout]);

  // ─── Cross-tab sync via BroadcastChannel ───────────────────────
  // Token cookies are HttpOnly so we can't watch them via `storage`.
  // Instead, login/logout broadcasts a message and other tabs refetch.
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const bc = new BroadcastChannel('kinloom_auth');
    bc.onmessage = (e) => {
      if (e.data === 'logout') setUser(null);
      else if (e.data === 'login') refresh();
    };
    return () => bc.close();
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}

// Re-export for any callers that previously imported them from ./api.
export { IDLE_TIMEOUT_MS, ABSOLUTE_TIMEOUT_MS };
