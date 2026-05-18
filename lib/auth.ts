import { apiFetch, ApiError, type AuthTokens } from './api';

export type { AuthTokens };

/**
 * One family space the current user belongs to.
 * Backend currently returns the `member_id` (this user's member row inside that space)
 * alongside the space's ulid + name.
 */
export type FamilySpaceRef = {
  ulid: string;
  name: string;
  member_id?: string;
  role?: 'owner' | 'member';
};

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
  /**
   * The OpenAPI spec types this as `string`, but the real payload is a JSON
   * array (or string-encoded JSON array) of `FamilySpaceRef`. We accept any
   * of those and normalize via `parseFamilySpaces`.
   */
  family_spaces?: FamilySpaceRef[] | string | null;
  onboarding_state?: 'complete' | 'profile_set' | 'pending';
};

/**
 * Normalize the `family_spaces` field into a real array.
 * The backend spec types this as `string`, but in practice it can be:
 *   - an array of refs (preferred)
 *   - a JSON-encoded array string
 *   - a JSON-encoded single object string
 *   - a single ulid string
 *   - a CSV of ulids
 */
export function parseFamilySpaces(
  raw: AuthUser['family_spaces'],
): FamilySpaceRef[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'string') return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const v = JSON.parse(trimmed);
      if (Array.isArray(v)) return v;
      if (v && typeof v === 'object' && 'ulid' in v) return [v as FamilySpaceRef];
    } catch {
      // fall through to the bare-string handlers
    }
  }
  // Bare ulid or csv of ulids — wrap into minimal refs.
  return trimmed.split(',').map(s => s.trim()).filter(Boolean).map(ulid => ({ ulid, name: '' }));
}

/** Returns the currently-active family space ulid (first one), or null. */
export function getActiveFamilySpaceId(user: AuthUser | null): string | null {
  if (!user) return null;
  const spaces = parseFamilySpaces(user.family_spaces);
  return spaces[0]?.ulid ?? null;
}

/**
 * Auth endpoints. After Epic 3 these talk to the Next.js BFF
 * (`/api/auth/*`), not to Laravel directly. The BFF sets HttpOnly
 * cookies; the browser never sees the bearer or refresh token.
 */

async function authFetch<T>(path: string, body?: unknown): Promise<T> {
  const init: RequestInit = {
    method: 'POST',
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
  };
  if (body !== undefined) {
    init.headers = { ...init.headers, 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body);
  }
  const res = await fetch(path, init);
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
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

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await authFetch<{ user: AuthUser }>('/api/auth/login', { email, password });
  return res.user;
}

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
};

export async function register(payload: RegisterPayload): Promise<AuthUser> {
  const res = await authFetch<{ user: AuthUser }>('/api/auth/register', payload);
  return res.user;
}

export async function forgotPassword(email: string): Promise<void> {
  await apiFetch<{ message: string }>('/auth/forgot-password', {
    method: 'POST',
    body: { email },
    anonymous: true,
  });
}

export async function logout(): Promise<void> {
  try {
    await authFetch<{ ok: true }>('/api/auth/logout');
  } catch {
    // Best effort — cookies should clear server-side. If not, the next
    // protected request will 401 and middleware will redirect.
  }
}

export async function getMe(): Promise<AuthUser> {
  const res = await authFetch<{ user: AuthUser }>('/api/auth/me');
  return res.user;
}

// ─── Settings: profile / password / account ───────────────────────

export type UpdateProfilePayload = {
  display_name?: string;
  avatar_url?: string | null;
};

export type ProfileResponse = {
  profile: {
    display_name: string | null;
    avatar_url: string | null;
  };
};

export async function updateProfile(
  payload: UpdateProfilePayload,
): Promise<ProfileResponse['profile']> {
  const res = await apiFetch<ProfileResponse>('/me/profile', {
    method: 'PATCH',
    body: payload,
  });
  return res.profile;
}

export type ChangePasswordPayload = {
  current_password: string;
  new_password: string;
  new_password_confirmation: string;
};

export async function changePassword(payload: ChangePasswordPayload): Promise<void> {
  await apiFetch<void>('/me/change-password', {
    method: 'POST',
    body: payload,
  });
}

export async function deleteAccount(): Promise<void> {
  await apiFetch<void>('/me', { method: 'DELETE' });
  await logout();
}

// ─── Onboarding ───────────────────────────────────────────────────

export type OnboardingProfilePayload = {
  first_name: string;
  family_name?: string | null;
  role?: string | null;
  gender?: 'f' | 'm' | 'n' | null;
};

export type OnboardingProfileResponse = {
  user: { ulid: string; display_name: string | null; name: string };
  family_space: { ulid: string; name: string };
  member: { member_id: string; name: string; role_label: string | null };
};

/** POST /onboarding/profile — creates the user's profile + first family space. */
export async function onboardingProfile(
  payload: OnboardingProfilePayload,
): Promise<OnboardingProfileResponse> {
  return apiFetch<OnboardingProfileResponse>('/onboarding/profile', {
    method: 'POST',
    body: payload,
  });
}
