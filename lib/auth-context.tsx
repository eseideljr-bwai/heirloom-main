'use client';

/**
 * Client-side auth state (Epic 1: Firebase-backed).
 *
 * Lifecycle:
 *   1. Root layout (server) hydrates `initialUser` from the Firebase
 *      session cookie via /me. First paint has the right user.
 *   2. On mount, this component subscribes to Firebase via
 *      onIdTokenChanged. That fires:
 *        • when the user signs in,
 *        • when the user signs out,
 *        • automatically ~5 minutes before the ID token expires.
 *      Every fire posts the fresh ID token to /api/auth/session so
 *      the server-side cookie used for SSR Bearer attachment stays
 *      fresh.
 *   3. login/register/logout call the helpers in lib/auth.ts, which
 *      drive Firebase + sync the server-side session.
 *
 * Epic-2 timeouts (idle 24h, absolute 30d) are still enforced
 * client-side; on expiry we sign out of Firebase and bounce to `/`.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { onIdTokenChanged } from 'firebase/auth';
import {
  AuthUser,
  RegisterPayload,
  getMe,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  syncSessionRefresh,
} from './auth';
import { firebaseAuth } from './firebase-client';
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

export type AuthProviderProps = {
  children: React.ReactNode;
  /** Server-rendered initial user (from the root layout). */
  initialUser?: AuthUser | null;
};

export function AuthProvider({ children, initialUser = null }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  // Loading is only true between mount and the first onIdTokenChanged
  // tick when we already have a server-hydrated user — practically
  // unobservable.
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

  // ─── Firebase ID-token rotation ─────────────────────────────────
  // onIdTokenChanged fires on sign-in, sign-out, and ~5min before
  // expiry. We push the fresh token to the server so the SSR Bearer
  // cookie stays usable.
  useEffect(() => {
    const unsub = onIdTokenChanged(firebaseAuth(), async (fbUser) => {
      if (!fbUser) {
        // Signed out either by us or remotely (e.g. revoked refresh).
        // Don't yank `user` here on initial mount — login() already
        // sets it; this branch matters only when sign-out happens
        // outside our flow.
        return;
      }
      try {
        const idToken = await fbUser.getIdToken();
        await syncSessionRefresh(idToken);
      } catch {
        // Server didn't accept the refresh. Next SSR fetch will 401
        // and middleware will redirect.
      }
    });
    return unsub;
  }, []);

  // ─── Activity tracking (idle 24h) ───────────────────────────────
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
    const onVis = () => tick();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [user, logout]);

  // ─── Cross-tab sync via BroadcastChannel ───────────────────────
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

export { IDLE_TIMEOUT_MS, ABSOLUTE_TIMEOUT_MS };
