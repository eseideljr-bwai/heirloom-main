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
  clearServerSession,
  getMe,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  syncSessionEstablish,
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
import { postToNative } from './embed';
import { useEmbedded } from './embed-context';

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  authReady: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (payload: RegisterPayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export type AuthProviderProps = {
  children: React.ReactNode;
  /** Server-rendered initial user (from the root layout). */
  initialUser?: AuthUser | null;
};

export function AuthProvider({ children, initialUser = null }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [loading] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const embedded = useEmbedded();

  const refresh = useCallback(async () => {
    if (!getSessionStartedAt()) {
      setUser(null);
      return;
    }
    try {
      const me = await getMe();
      setUser(me);
    } catch {
      // Keep the current user (SSR hydrate / prior success). A transient
      // /me 401 after invite-accept used to wipe state and leave AppShell
      // permanently blank on /home.
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
    // In the iOS WebView the native app installed the session cookies and
    // the web SDK has no Firebase user of its own. Reading that as a
    // sign-out would DELETE the session, which also revokes the refresh
    // tokens the native app is signed in with.
    if (embedded) {
      setAuthReady(true);
      return;
    }
    const unsub = onIdTokenChanged(firebaseAuth(), async (fbUser) => {
      if (!fbUser) {
        // Firebase is signed out, but stale server cookies may survive
        // (crashed logout, deleted account). Middleware presence-checks
        // `kinloom_session`, so leftovers cause a `/home` ⟷ `/` redirect
        // loop. Clear them before AppShell redirects.
        if (getSessionStartedAt()) {
          await clearServerSession();
        }
        setUser(null);
        setAuthReady(true);
        return;
      }
      try {
        const idToken = await fbUser.getIdToken();
        // If the server session cookie is gone (logout elsewhere,
        // deleted account, expiry) but Firebase still has us signed in,
        // a plain 'refresh' never re-mints `kinloom_session` → middleware
        // bounces /home → /?next=/home forever. Re-establish in that case.
        if (getSessionStartedAt()) {
          await syncSessionRefresh(idToken);
        } else {
          await syncSessionEstablish(idToken);
        }
        const me = await getMe();
        setUser(me);
      } catch {
        // A failed /me or session sync (network blip, API restart): keep
        // whatever the server rendered. The API provisions an account on
        // its first request, so there is no "signed in but unknown" state
        // to paper over any more.
      } finally {
        setAuthReady(true);
      }
    });
    return unsub;
  }, [embedded]);

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
  const expiryReportedRef = useRef(false);
  useEffect(() => {
    if (!user) return;
    const tick = () => {
      const status = checkSessionStatus();
      if (status === 'idle_expired' || status === 'absolute_expired') {
        // Embedded, the native app decides what an expired session means;
        // logging out here would revoke its tokens too.
        if (embedded) {
          if (!expiryReportedRef.current) {
            expiryReportedRef.current = postToNative({ type: 'sessionExpired' });
          }
          if (expiryReportedRef.current) return;
        }
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
  }, [user, logout, embedded]);

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
    <AuthContext.Provider value={{ user, loading, authReady, login, register, logout, refresh }}>
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
