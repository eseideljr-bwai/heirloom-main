'use client';

/**
 * Client-side auth state. Replaces Firebase's `onAuthStateChanged`.
 *
 * On mount: if we have a token in localStorage, hit /me to validate it
 * and load the current user. If /me fails (e.g. revoked), tokens are
 * cleared and the user is treated as signed out.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
import { clearTokens, getIdToken } from './api';

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (payload: RegisterPayload) => Promise<AuthUser>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getIdToken()) {
      setUser(null);
      return;
    }
    try {
      const me = await getMe();
      setUser(me);
    } catch {
      clearTokens();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refresh();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const u = await apiLogin(email, password);
    // Hydrate full profile (login response is missing onboarding_state etc).
    try {
      const me = await getMe();
      setUser(me);
      return me;
    } catch {
      setUser(u);
      return u;
    }
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const u = await apiRegister(payload);
    try {
      const me = await getMe();
      setUser(me);
      return me;
    } catch {
      setUser(u);
      return u;
    }
  }, []);

  const logout = useCallback(() => {
    apiLogout();
    setUser(null);
  }, []);

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
