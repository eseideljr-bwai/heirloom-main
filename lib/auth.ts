/**
 * Client-side auth surface (Epic 1: Firebase-backed).
 *
 *   • Identity (signup, login, password reset, password change,
 *     delete) is owned by Firebase. The browser holds the ID token.
 *   • Profile data (name, family spaces, onboarding state) lives in
 *     Laravel and is fetched via the BFF proxy with the Firebase
 *     ID token attached as Bearer.
 *   • After every Firebase auth state change, the client posts the
 *     current ID token to /api/auth/session so server components can
 *     do SSR with a Bearer header.
 *
 * This module is browser-only. Server code uses lib/server/auth.ts.
 */

import {
  EmailAuthProvider,
  applyActionCode,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  deleteUser,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile as fbUpdateProfile,
  verifyPasswordResetCode,
} from 'firebase/auth';
import { firebaseAuth } from './firebase-client';
import { apiFetch, ApiError } from './api';
import { kinloomApi } from './kinloom-api';
import type { components } from './api-schema/typed';

// ─── Types ──────────────────────────────────────────────────────────

/**
 * What `GET /me` returns (Phase 3 contract §3.1): the account, its one
 * Family Home, the Family Spaces that Home is active in, and readiness.
 * Generated from the OpenAPI contract, so it cannot drift from the API.
 */
export type Me = components['schemas']['Me'];
export type HomeSummary = components['schemas']['HomeSummary'];
export type SpaceSummary = components['schemas']['SpaceSummary'];

export type AuthUser = Me;

/**
 * The container the pre-Phase-3 screens still ask for: `ulid` and `name`
 * are what their API calls take. It is now always the person's Family
 * Home. Kept only so screens can be rewired one at a time; new code uses
 * `user.home` and `user.spaces` directly.
 *
 * @deprecated Use `HomeSummary` / `SpaceSummary`.
 */
export type FamilySpaceRef = {
  ulid: string;
  name: string;
  member_id?: string;
  role?: 'owner' | 'member';
};

/** The Home as the legacy container ref. @deprecated see `FamilySpaceRef`. */
export function homeAsLegacyRef(user: AuthUser): FamilySpaceRef {
  return {
    ulid: user.home.id,
    name: user.home.name,
    member_id: user.person_id,
    role: user.home.role === 'member' ? 'member' : 'owner',
  };
}

/** True when the user owns or co-owns their Family Home. */
export function canManageHome(user: AuthUser | null): boolean {
  return user?.home.role === 'owner' || user?.home.role === 'co_owner';
}

/**
 * True if the user manages the Home with this id.
 *
 * @deprecated The container id is the Home id now; prefer `canManageHome`.
 */
export function isOwnerOfSpace(user: AuthUser | null, spaceId: string | null): boolean {
  return !!user && !!spaceId && user.home.id === spaceId && canManageHome(user);
}

/** Memorialized accounts (CO-1 C2) read /me and nothing else. */
export function isMemorialized(user: AuthUser | null): boolean {
  return !!user?.memorialized_at;
}

// ─── Server-side session sync ───────────────────────────────────────

/**
 * Push the current Firebase ID token to the server so SSR can use it
 * as a Bearer for Laravel calls. `mode: "establish"` mints a fresh
 * Firebase session cookie (post-signin); `mode: "refresh"` just
 * rotates the short-lived id_token cookie.
 */
async function syncSession(
  idToken: string,
  mode: 'establish' | 'refresh',
): Promise<void> {
  const res = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ idToken, mode }),
  });
  if (!res.ok) {
    let detail = '';
    try {
      const data = await res.json();
      detail = typeof data?.message === 'string' ? data.message : '';
    } catch {
      // ignore
    }
    throw new ApiError(res.status, detail || `Session sync failed (${res.status}).`, null);
  }
}

/** Called by AuthProvider on every Firebase ID-token rotation. */
export async function syncSessionRefresh(idToken: string): Promise<void> {
  await syncSession(idToken, 'refresh');
}

/**
 * Re-mint the long-lived `kinloom_session` cookie. Used when Firebase
 * still has the user signed in but the server session cookie is gone
 * (logout in another tab, deleted account, 14d expiry) — a plain
 * refresh never re-mints it, so middleware would bounce protected
 * routes back to `/` forever.
 */
export async function syncSessionEstablish(idToken: string): Promise<void> {
  await syncSession(idToken, 'establish');
}

async function destroySession(): Promise<void> {
  try {
    await fetch('/api/auth/session', {
      method: 'DELETE',
      credentials: 'same-origin',
    });
  } catch {
    // best-effort
  }
}

/**
 * Clear the server-side session cookies without touching Firebase.
 * Used when the Firebase client is already signed out but stale server
 * cookies survive (crashed logout, cleared IndexedDB, deleted account).
 * If we don't clear them, middleware keeps redirecting `/` → `/home`
 * while AppShell redirects `/home` → `/` — an infinite blank-page loop.
 */
export async function clearServerSession(): Promise<void> {
  await destroySession();
}

// ─── Identity (Firebase-backed) ─────────────────────────────────────

/**
 * Map a Firebase Auth error code to a user-friendly message that we
 * also use to feed the existing ApiError-based UI flow. We deliberately
 * collapse "wrong-password" and "user-not-found" into the same string
 * so the frontend can't enumerate registered emails.
 */
function authErrorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/missing-password':
      return 'Please enter a password.';
    case 'auth/weak-password':
      return 'Password must be at least 8 characters.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in instead.';
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-credential':
      return 'Invalid email or password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again in a few minutes.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/requires-recent-login':
      return 'For your security, please sign in again to continue.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

function toApiError(err: unknown): ApiError {
  const code = (err as { code?: string })?.code ?? 'auth/unknown';
  const status = code === 'auth/email-already-in-use'
    ? 409
    : code === 'auth/wrong-password' ||
      code === 'auth/user-not-found' ||
      code === 'auth/invalid-credential'
      ? 401
      : code === 'auth/too-many-requests'
        ? 429
        : 422;
  return new ApiError(status, authErrorMessage(code), { code });
}

/**
 * Sign in. Throws ApiError on failure so existing UI catch blocks keep
 * working. On success returns the *Laravel* user profile (fetched
 * after the session cookie is in place).
 */
export async function login(email: string, password: string): Promise<AuthUser> {
  let cred;
  try {
    cred = await signInWithEmailAndPassword(firebaseAuth(), email, password);
  } catch (err) {
    throw toApiError(err);
  }
  const idToken = await cred.user.getIdToken();
  await syncSession(idToken, 'establish');
  // The API provisions the account on its first authenticated request,
  // so a signed-in person always has a /me.
  return getMe();
}

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
};

export async function register(payload: RegisterPayload): Promise<AuthUser> {
  if (payload.password !== payload.password_confirmation) {
    throw new ApiError(422, 'Passwords do not match.', {
      errors: { password_confirmation: ['Passwords do not match.'] },
    });
  }
  let cred;
  try {
    cred = await createUserWithEmailAndPassword(
      firebaseAuth(),
      payload.email,
      payload.password,
    );
  } catch (err) {
    throw toApiError(err);
  }
  // Firebase has its own display-name field; stash the user's name
  // there too so Laravel can pick it up when it lazily provisions the
  // user row on the first authenticated call.
  if (payload.name) {
    try {
      await fbUpdateProfile(cred.user, { displayName: payload.name });
    } catch {
      // non-fatal — Laravel still gets the email + uid
    }
  }
  const idToken = await cred.user.getIdToken(/* forceRefresh */ true);
  await syncSession(idToken, 'establish');
  // First request provisions the account; the new person lands on
  // `onboarding_state: 'profile_pending'`.
  return getMe();
}

// ─── Email flows (Firebase-native send + Firebase action-link apply) ─
//
// Transactional auth emails are sent by Firebase itself (the Web SDK
// hands off to Firebase's mailer). We tried routing these through the
// Laravel API's Resend integration, but that path returned success
// while silently dropping mail (unverified sending domain), so email
// reset/verification never arrived. Firebase-native delivery works, so
// we send directly. The emails carry Firebase action links (oobCode);
// the *completion* step still runs client-side via the Web SDK.

/**
 * Send a password-reset email via Firebase. With Firebase's email-
 * enumeration protection enabled this resolves even for unknown
 * addresses, so callers can safely show a generic "if an account
 * exists…" message without leaking which emails are registered.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(firebaseAuth(), email);
  } catch (err) {
    throw toApiError(err);
  }
}

/**
 * (Re)send a verification email via Firebase for the currently-signed-
 * in user. Throws ApiError — 401 when there's no local Firebase user,
 * or 429 when Firebase rate-limits repeated sends.
 */
export async function requestEmailVerification(): Promise<void> {
  const user = firebaseAuth().currentUser;
  if (!user) {
    throw new ApiError(401, 'Please sign in again to verify your email.', null);
  }
  try {
    await sendEmailVerification(user);
  } catch (err) {
    throw toApiError(err);
  }
}

/**
 * Validate a password-reset oobCode without consuming it. Resolves to
 * the target email (so the reset page can show who it's for) or throws
 * ApiError when the code is invalid/expired.
 */
export async function verifyResetCode(oobCode: string): Promise<string> {
  try {
    return await verifyPasswordResetCode(firebaseAuth(), oobCode);
  } catch (err) {
    throw toApiError(err);
  }
}

/**
 * Complete a password reset from a Firebase action link. Validates the
 * oobCode (also yields the target email) then sets the new password.
 * Returns the email the reset was applied to.
 */
export async function completePasswordReset(
  oobCode: string,
  newPassword: string,
): Promise<string> {
  try {
    const email = await verifyPasswordResetCode(firebaseAuth(), oobCode);
    await confirmPasswordReset(firebaseAuth(), oobCode, newPassword);
    return email;
  } catch (err) {
    throw toApiError(err);
  }
}

/**
 * Apply an email-verification action link (oobCode) from a Firebase
 * email. After marking the address verified we force-refresh the ID
 * token and re-mint the session cookie so the `email_verified` claim
 * (baked in at mint time) flips true and the app gate opens.
 *
 * Returns true when a signed-in session was re-established; false when
 * the code was applied but there's no local Firebase user (e.g. the
 * link was opened in a browser where the user isn't signed in) — the
 * caller should send them to sign in.
 */
export async function applyEmailVerification(oobCode: string): Promise<boolean> {
  try {
    await applyActionCode(firebaseAuth(), oobCode);
  } catch (err) {
    throw toApiError(err);
  }
  return syncEmailVerified();
}

/**
 * Reload the current Firebase user and, if their email is verified,
 * re-mint the server session cookie so the `email_verified` claim is
 * refreshed. Returns true when the (verified) session was synced,
 * false when there's no signed-in user or the email is still
 * unverified. Used by both the action page and the "I've verified"
 * button on the pending screen.
 */
export async function syncEmailVerified(): Promise<boolean> {
  const user = firebaseAuth().currentUser;
  if (!user) return false;
  try {
    await user.reload();
    if (!user.emailVerified) return false;
    const idToken = await user.getIdToken(/* forceRefresh */ true);
    await syncSession(idToken, 'establish');
    return true;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function logout(): Promise<void> {
  try {
    await signOut(firebaseAuth());
  } catch {
    // ignore — we still want to clear server cookies
  }
  await destroySession();
}

/** GET /me — current Laravel profile, attached via Bearer. */
export async function getMe(): Promise<AuthUser> {
  return kinloomApi.get('/me');
}

// ─── Settings: profile / password / account ───────────────────────

export type UpdateProfilePayload = components['schemas']['ProfileChanges'];
export type Profile = components['schemas']['Profile'];

/** PATCH /me/profile — send only the fields that changed. */
export async function updateProfile(payload: UpdateProfilePayload): Promise<Profile> {
  return kinloomApi.patch('/me/profile', { body: payload });
}

export type ChangePasswordPayload = {
  current_password: string;
  new_password: string;
  new_password_confirmation: string;
};

export async function changePassword(payload: ChangePasswordPayload): Promise<void> {
  if (payload.new_password !== payload.new_password_confirmation) {
    throw new ApiError(422, 'New password and confirmation do not match.', {
      errors: {
        new_password_confirmation: ['New password and confirmation do not match.'],
      },
    });
  }
  const user = firebaseAuth().currentUser;
  if (!user || !user.email) {
    throw new ApiError(401, 'Please sign in again.', null);
  }
  try {
    const cred = EmailAuthProvider.credential(user.email, payload.current_password);
    await reauthenticateWithCredential(user, cred);
    await updatePassword(user, payload.new_password);
  } catch (err) {
    throw toApiError(err);
  }
  // Force-refresh so the next ID token has a fresh `auth_time` (within
  // the 5-minute window Firebase enforces for session cookie minting).
  const fresh = await user.getIdToken(true);
  await syncSession(fresh, 'refresh');
}

export async function deleteAccount(): Promise<void> {
  await apiFetch<void>('/me', { method: 'DELETE' });
  const user = firebaseAuth().currentUser;
  if (user) {
    try {
      await deleteUser(user);
    } catch {
      // If Firebase requires recent login, the Laravel row is already
      // gone; the next request will 401 and middleware will redirect.
    }
  }
  await destroySession();
}

// ─── Onboarding ───────────────────────────────────────────────────

export type OnboardingProfilePayload = components['schemas']['OnboardingProfileBody'];
export type OnboardingProfileResponse = components['schemas']['OnboardingProfileResult'];

/**
 * POST /onboarding/profile — names the account, renames a default-named
 * Home to "The {family_name} Home" and completes onboarding. It creates
 * nothing and never creates a Family Space. Refetch /me afterwards.
 */
export async function onboardingProfile(
  payload: OnboardingProfilePayload,
): Promise<OnboardingProfileResponse> {
  return kinloomApi.post('/onboarding/profile', { body: payload });
}
