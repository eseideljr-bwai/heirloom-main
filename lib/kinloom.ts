/**
 * Kinloom API client.
 *
 * Wraps the endpoints under `/family-spaces/{familySpace}/...` related to
 * creating + fetching kinlooms. Mirrors the mock shapes in
 * `app/lib/mock-data.ts` where possible so UI code can switch between mock
 * and live data with minimal churn.
 */

import { apiFetch } from './api';

// ─── Types ──────────────────────────────────────────────────────────

export type KinloomTypeSlug =
  | 'story'
  | 'lesson'
  | 'belief'
  | 'message'
  | 'tradition'
  | 'reflection'
  | 'milestone'
  | 'photo-collection'
  | (string & {});

export type KinloomType = {
  slug: KinloomTypeSlug;
  label: string;
  definition: string;
  prompt: string;
};

export type Visibility = 'family' | 'private';
export type KinloomStatus = 'draft' | 'published';

/** A taggable family member, as returned by /create-context. */
export type TaggableMember = {
  member_id: string;
  name: string;
  role_label: string | null;
  kin_term: string | null;
  gender: 'f' | 'm' | 'n' | string;
  tone: string;
  initials: string | null;
  deceased: boolean;
};

export type CreateContextResponse = {
  type: KinloomType;
  /** API types this as `string` in the spec but it is actually an array. */
  taggable_members: TaggableMember[] | string;
  default_visibility: Visibility;
};

export type KinloomAuthor = {
  member_id: string;
  name: string;
  role_label: string | null;
  kin_term: string | null;
  gender: string;
  tone: string;
  initials: string | null;
  deceased: boolean;
};

export type KinloomMedia = {
  url: string | null;
  duration_seconds?: number | string | null;
  transcript_text?: string | null;
  width?: number | string | null;
  height?: number | string | null;
};

export type Kinloom = {
  ulid: string;
  type_slug: string;
  type_label: string;
  title: string;
  body_paragraphs: string[] | Record<string, unknown> | unknown[];
  created_at: string;
  visibility: Visibility | string;
  author: KinloomAuthor | null;
  audio: KinloomMedia | null;
  photo: KinloomMedia | null;
  tagged_kin: TaggableMember[] | string;
  hold: { held_by_me: boolean; count: number };
  comments: unknown;
};

export type CreateKinloomPayload = {
  type_slug: string;
  title: string;
  body: string;
  visibility?: Visibility | null;
  status?: KinloomStatus | null;
  tagged_member_ids?: string[];
};

// ─── Helpers ────────────────────────────────────────────────────────

/** Normalize array-ish fields that the API may return as a JSON string. */
export function normalizeList<T>(value: T[] | string | null | undefined): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

// ─── Endpoints ──────────────────────────────────────────────────────

/** GET /family-spaces/{familySpace}/create-context/{typeSlug} */
export async function getCreateContext(
  familySpaceId: string,
  typeSlug: string,
): Promise<{ type: KinloomType; taggableMembers: TaggableMember[]; defaultVisibility: Visibility }> {
  const res = await apiFetch<CreateContextResponse>(
    `/family-spaces/${encodeURIComponent(familySpaceId)}/create-context/${encodeURIComponent(typeSlug)}`,
  );
  return {
    type: res.type,
    taggableMembers: normalizeList<TaggableMember>(res.taggable_members),
    defaultVisibility: (res.default_visibility as Visibility) || 'family',
  };
}

/** POST /family-spaces/{familySpace}/kinlooms */
export async function createKinloom(
  familySpaceId: string,
  payload: CreateKinloomPayload,
): Promise<Kinloom> {
  return apiFetch<Kinloom>(
    `/family-spaces/${encodeURIComponent(familySpaceId)}/kinlooms`,
    { method: 'POST', body: payload },
  );
}

/** A row as returned from the library list endpoint. */
export type LibraryRow = Partial<Kinloom> & {
  ulid: string;
  type_slug: string;
  type_label: string;
  title: string;
  excerpt?: string | null;
  created_at: string;
  has_audio?: boolean;
  has_photo?: boolean;
  author: KinloomAuthor | null;
};

export type LibraryResponse = {
  total: number | string;
  kinlooms: LibraryRow[] | string;
  next_cursor: string | null;
};

/** GET /family-spaces/{familySpace}/library */
export async function getLibrary(familySpaceId: string): Promise<{
  total: number;
  kinlooms: LibraryRow[];
  nextCursor: string | null;
}> {
  const res = await apiFetch<LibraryResponse>(
    `/family-spaces/${encodeURIComponent(familySpaceId)}/library`,
  );
  const total = typeof res.total === 'number' ? res.total : Number(res.total) || 0;
  return {
    total,
    kinlooms: normalizeList<LibraryRow>(res.kinlooms),
    nextCursor: res.next_cursor ?? null,
  };
}

/** GET /family-spaces/{familySpace}/kinlooms/{kinloom} */
export async function getKinloom(
  familySpaceId: string,
  kinloomId: string,
): Promise<Kinloom> {
  return apiFetch<Kinloom>(
    `/family-spaces/${encodeURIComponent(familySpaceId)}/kinlooms/${encodeURIComponent(kinloomId)}`,
  );
}

/** POST /family-spaces/{familySpace}/kinlooms/{kinloom}/hold — toggle */
export async function toggleHold(
  familySpaceId: string,
  kinloomId: string,
): Promise<{ held_by_me: boolean; count: number }> {
  return apiFetch<{ held_by_me: boolean; count: number }>(
    `/family-spaces/${encodeURIComponent(familySpaceId)}/kinlooms/${encodeURIComponent(kinloomId)}/hold`,
    { method: 'POST' },
  );
}

/** Normalize `body_paragraphs` (which the spec types as array|object|array<string>). */
export function bodyParagraphs(body: Kinloom['body_paragraphs']): string[] {
  if (Array.isArray(body)) return body.map(p => typeof p === 'string' ? p : String(p ?? ''));
  if (typeof body === 'string') return (body as string).split(/\n\n+/);
  if (body && typeof body === 'object') return Object.values(body as Record<string, unknown>).map(p => String(p ?? ''));
  return [];
}

/** Format an ISO timestamp like "Mar 14, 2025". */
export function formatKinloomDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** GET /kinloom-types — global list, no family space needed. */
export async function listKinloomTypes(): Promise<KinloomType[]> {
  const res = await apiFetch<{ types: KinloomType[] | string }>('/kinloom-types');
  return normalizeList<KinloomType>(res.types);
}

// ─── Onboarding ─────────────────────────────────────────────────────

export type OnboardingFirstKinloomPayload = {
  title?: string | null;
  body: string;
  visibility?: Visibility | null;
};

export type OnboardingFirstKinloomResponse = {
  entry: {
    ulid: string;
    type_slug: string;
    title: string;
    body: string;
    created_at: string;
  };
};

/** POST /family-spaces/{familySpace}/onboarding/first-kinloom */
export async function onboardingFirstKinloom(
  familySpaceId: string,
  payload: OnboardingFirstKinloomPayload,
): Promise<OnboardingFirstKinloomResponse> {
  return apiFetch<OnboardingFirstKinloomResponse>(
    `/family-spaces/${encodeURIComponent(familySpaceId)}/onboarding/first-kinloom`,
    { method: 'POST', body: payload },
  );
}
