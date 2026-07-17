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
  FamilySpaceRef,
  RegisterPayload,
  clearServerSession,
  getMe,
  login as apiLogin,
  logout as apiLogout,
  parseFamilySpaces,
  register as apiRegister,
  syncSessionEstablish,
  syncSessionRefresh,
} from './auth';
import { firebaseAuth } from './firebase-client';
import {
  ABSOLUTE_TIMEOUT_MS,
  ApiError,
  checkSessionStatus,
  getSessionStartedAt,
  IDLE_TIMEOUT_MS,
  touchActivity,
} from './api';

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  authReady: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (payload: RegisterPayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  /** Optimistically add a family space (e.g. right after accepting an invite). */
  upsertFamilySpace: (space: FamilySpaceRef) => void;
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

  const upsertFamilySpace = useCallback((space: FamilySpaceRef) => {
    setUser(prev => {
      if (!prev) return prev;
      const existing = parseFamilySpaces(prev.family_spaces);
      if (existing.some(s => s.ulid === space.ulid)) {
        return { ...prev, family_spaces: existing };
      }
      return { ...prev, family_spaces: [...existing, space] };
    });
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
      } catch (err) {
        const authErr =
          err instanceof ApiError && (err.status === 401 || err.status === 403);
        if (authErr) {
          // /me 401s until the Laravel row is provisioned (onboarding) and
          // the email is verified. A not-yet-onboarded user is
          // indistinguishable from a deleted one client-side, so don't
          // sign them out — synthesize a minimal user from the Firebase
          // record and let the app route them (→ /verify-email if
          // unverified, → /onboarding/profile when they have no space).
          setUser(prev => prev ?? {
            ulid: fbUser.uid,
            email: fbUser.email ?? '',
            name: fbUser.displayName ?? '',
            display_name: fbUser.displayName ?? null,
            avatar_url: null,
            phone: null,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
            family_spaces: [],
            onboarding_state: 'pending',
          });
        }
        // Anything else (network blip): keep initialUser as-is.
      } finally {
        setAuthReady(true);
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
    <AuthContext.Provider value={{ user, loading, authReady, login, register, logout, refresh, upsertFamilySpace }}>
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
