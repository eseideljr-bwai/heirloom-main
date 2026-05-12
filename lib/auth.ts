import { apiFetch, saveTokens, clearTokens, AuthTokens } from './api';

export type AuthUser = {
  ulid: string;
  email: string;
  name: string;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  timezone: string;
  /** Present on /me, absent on login/register responses. */
  created_at?: string;
  family_spaces?: string;
  onboarding_state?: 'complete' | 'profile_set' | 'pending';
};

type AuthResponse = AuthTokens & { user: AuthUser };

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
    anonymous: true,
  });
  saveTokens(res);
  return res.user;
}

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
};

export async function register(payload: RegisterPayload): Promise<AuthUser> {
  const res = await apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: payload,
    anonymous: true,
  });
  saveTokens(res);
  return res.user;
}

export async function forgotPassword(email: string): Promise<void> {
  await apiFetch<{ message: string }>('/auth/forgot-password', {
    method: 'POST',
    body: { email },
    anonymous: true,
  });
}

export function logout() {
  clearTokens();
}

export async function getMe(): Promise<AuthUser> {
  const res = await apiFetch<{ data: AuthUser }>('/me');
  return res.data;
}
