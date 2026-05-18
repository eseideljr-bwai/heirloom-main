'use client';

/**
 * Client-side auth state. Replaces Firebase's `onAuthStateChanged`.
 *
 * Epic 2 behaviour:
 *   - Caches the last-known `/me` payload to localStorage so protected
 *     routes can render synchronously on repeat visits (no auth-flicker
 *     "loading splash" between hydration and `/me` resolving).
 *   - Enforces an idle 24h timeout and an absolute 30d session lifetime.
 *     Activity = pointer/keyboard input on the document, or any
 *     authenticated API call (see `apiFetch` in ./api).
 *   - On expiry, tokens are cleared and the user is bounced to `/`.
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
  clearTokens,
  getIdToken,
  IDLE_TIMEOUT_MS,
  touchActivity,
} from './api';

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (payload: RegisterPayload) => Promise<AuthUser>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const USER_CACHE_KEY = 'heirloom.user_cache';

function readCachedUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  if (!window.localStorage.getItem('heirloom.id_token')) return null;
  try {
    const raw = window.localStorage.getItem(USER_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

function writeCachedUser(user: AuthUser | null) {
  if (typeof window === 'undefined') return;
  if (user) {
    window.localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
  } else {
    window.localStorage.removeItem(USER_CACHE_KEY);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Initialize from cache so we don't render a loading state on every
  // protected route load. Middleware already redirected un-authed users.
  const [user, setUser] = useState<AuthUser | null>(() => readCachedUser());
  // `loading` only matters on cold starts when we have a token but no
  // cached user. Otherwise we're "loaded" immediately.
  const [loading, setLoading] = useState(() => {
    if (typeof window === 'undefined') return true;
    return !!getIdToken() && !readCachedUser();
  });

  const setUserPersist = useCallback((next: AuthUser | null) => {
    setUser(next);
    writeCachedUser(next);
  }, []);

  const refresh = useCallback(async () => {
    if (!getIdToken()) {
      setUserPersist(null);
      return;
    }
    try {
      const me = await getMe();
      setUserPersist(me);
    } catch {
      clearTokens();
      setUserPersist(null);
    }
  }, [setUserPersist]);

  // Cold-start hydration: validate the cached user against /me, but in
  // the background so we don't block first paint.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // First, check that the session hasn't expired while the tab was
      // closed. If it has, clear everything before we even hit the network.
      const status = checkSessionStatus();
      if (status === 'idle_expired' || status === 'absolute_expired') {
        clearTokens();
        setUserPersist(null);
        setLoading(false);
        return;
      }
      if (!getIdToken()) {
        setUserPersist(null);
        setLoading(false);
        return;
      }
      try {
        const me = await getMe();
        if (!cancelled) setUserPersist(me);
      } catch {
        if (!cancelled) {
          clearTokens();
          setUserPersist(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setUserPersist]);

  const login = useCallback(async (email: string, password: string) => {
    const u = await apiLogin(email, password);
    try {
      const me = await getMe();
      setUserPersist(me);
      return me;
    } catch {
      setUserPersist(u);
      return u;
    }
  }, [setUserPersist]);

  const register = useCallback(async (payload: RegisterPayload) => {
    const u = await apiRegister(payload);
    try {
      const me = await getMe();
      setUserPersist(me);
      return me;
    } catch {
      setUserPersist(u);
      return u;
    }
  }, [setUserPersist]);

  const logout = useCallback(() => {
    apiLogout();
    setUserPersist(null);
  }, [setUserPersist]);

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

  // ─── Cross-tab sync ────────────────────────────────────────────
  // If another tab logs in/out, mirror the change here instead of
  // running on stale state.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'heirloom.id_token') {
        if (!e.newValue) {
          setUser(null);
        } else if (!user) {
          // Another tab signed in — pull the fresh profile.
          refresh();
        }
      } else if (e.key === USER_CACHE_KEY && e.newValue) {
        try {
          setUser(JSON.parse(e.newValue) as AuthUser);
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [user, refresh]);

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
