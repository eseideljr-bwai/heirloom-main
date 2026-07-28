/**
 * Kinloom API client.
 *
 * Wraps the endpoints under `/family-spaces/{familySpace}/...` related to
 * creating + fetching kinlooms. Mirrors the mock shapes in
 * `app/lib/mock-data.ts` where possible so UI code can switch between mock
 * and live data with minimal churn.
 */

import { apiFetch } from './api';
import { rememberMediaAttachmentFromGcsPath } from './media-attachments';

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
  /**
   * Media attachment id. Needed for DELETE /media/{id}. OpenAPI currently
   * omits this on kinloom.show — when absent we resolve via the
   * upload-time localStorage map or republish the kinloom.
   */
  id?: string | null;
  url: string | null;
  duration_seconds?: number | string | null;
  transcript_text?: string | null;
  width?: number | string | null;
  height?: number | string | null;
};

/** Max photo/video attachments per kinloom — matches API `photos.maxItems`. */
export const MAX_KINLOOM_PHOTOS = 10;
/** Soft per-photo cap used by the client picker (API allows up to 500 MB). */
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

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
  /** Legacy single-photo field. New writes populate `photos` instead. */
  photo: KinloomMedia | null;
  /** May be absent on kinlooms created before multi-photo support. */
  photos?: KinloomMedia[] | string;
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

export type UpdateKinloomPayload = Partial<CreateKinloomPayload>;

export type Comment = {
  ulid: string;
  body: string;
  created_at: string;
  author: {
    member_id: string;
    name: string;
    gender: string;
    tone: string;
    initials: string | null;
  } | null;
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

/** PATCH /family-spaces/{familySpace}/kinlooms/{kinloom} */
export async function updateKinloom(
  familySpaceId: string,
  kinloomId: string,
  payload: UpdateKinloomPayload,
): Promise<Kinloom> {
  return apiFetch<Kinloom>(
    `/family-spaces/${encodeURIComponent(familySpaceId)}/kinlooms/${encodeURIComponent(kinloomId)}`,
    { method: 'PATCH', body: payload },
  );
}

/** DELETE /family-spaces/{familySpace}/kinlooms/{kinloom} */
export async function deleteKinloom(
  familySpaceId: string,
  kinloomId: string,
): Promise<void> {
  await apiFetch<void>(
    `/family-spaces/${encodeURIComponent(familySpaceId)}/kinlooms/${encodeURIComponent(kinloomId)}`,
    { method: 'DELETE' },
  );
}

/** POST /family-spaces/{familySpace}/kinlooms/{kinloom}/comments */
export async function addComment(
  familySpaceId: string,
  kinloomId: string,
  body: string,
): Promise<Comment> {
  return apiFetch<Comment>(
    `/family-spaces/${encodeURIComponent(familySpaceId)}/kinlooms/${encodeURIComponent(kinloomId)}/comments`,
    { method: 'POST', body: { body } },
  );
}

/** DELETE /family-spaces/{familySpace}/kinlooms/{kinloom}/comments/{comment} */
export async function deleteComment(
  familySpaceId: string,
  kinloomId: string,
  commentId: string,
): Promise<void> {
  await apiFetch<void>(
    `/family-spaces/${encodeURIComponent(familySpaceId)}/kinlooms/${encodeURIComponent(kinloomId)}/comments/${encodeURIComponent(commentId)}`,
    { method: 'DELETE' },
  );
}

/** Normalize the `comments` field on a Kinloom (the API ships it as a JSON string). */
export function normalizeComments(value: unknown): Comment[] {
  if (Array.isArray(value)) return value as Comment[];
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

/** Format an ISO timestamp as relative time, e.g. "2 days ago", "just now". */
export function formatRelativeTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  const seconds = Math.round((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return 'just now';

  const units: [string, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];

  for (const [name, secondsInUnit] of units) {
    if (seconds >= secondsInUnit) {
      const value = Math.floor(seconds / secondsInUnit);
      return `${value} ${name}${value === 1 ? '' : 's'} ago`;
    }
  }
  return 'just now';
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

// ─── Media uploads ──────────────────────────────────────────────────

/** MIME types the API will accept for photo uploads. */
export const PHOTO_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;

export type PhotoMimeType = typeof PHOTO_MIME_TYPES[number];

/** MIME types the API will accept for video uploads. */
export const VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
] as const;

export type VideoMimeType = typeof VIDEO_MIME_TYPES[number];

/**
 * Soft per-video cap used by the client picker (API allows up to 500 MB).
 * Phone clips routinely exceed the photo soft-cap.
 */
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

/** MIME types the API will accept for audio uploads. */
export const AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/aac',
  'audio/mp4',
  'audio/x-m4a',
] as const;

export type AudioMimeType = typeof AUDIO_MIME_TYPES[number];

/**
 * Detect video media from a signed URL path. `kinloom.show` returns
 * videos inside `photos` with no `type` field, so extension is the signal.
 */
export function isVideoMediaUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const path = (url.split('?')[0] ?? '').toLowerCase();
  return /\.(mp4|webm|mov|qt)$/.test(path);
}

/**
 * MediaRecorder candidate mime types (with codec hints), in preference
 * order. Each one **must** strip down (via `apiMimeForRecorder`) to a
 * value in `AUDIO_MIME_TYPES` or the API will reject the confirm step.
 *
 * `audio/mp4`     — Safari, recent Chrome
 * `audio/ogg`     — Firefox
 */
export const RECORDER_MIME_CANDIDATES = [
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mp4',
  'audio/ogg;codecs=opus',
  'audio/ogg',
] as const;

/** Strip `;codecs=...` so we send what the API enum expects. */
export function apiMimeForRecorder(mime: string): string {
  return mime.split(';')[0].trim();
}

/** File extension to use when wrapping a MediaRecorder Blob in a File. */
export function extensionForAudioMime(mime: string): string {
  switch (apiMimeForRecorder(mime)) {
    case 'audio/mpeg': return 'mp3';
    case 'audio/wav': return 'wav';
    case 'audio/ogg': return 'ogg';
    case 'audio/aac': return 'aac';
    case 'audio/mp4': return 'm4a';
    case 'audio/x-m4a': return 'm4a';
    default: return 'bin';
  }
}

/** 500 MB — matches the `file_size.maximum` in the OpenAPI spec. */
export const MAX_UPLOAD_BYTES = 524_288_000;

export type MediaPurpose = 'audio' | 'photo';
export type MediaType = 'audio' | 'video' | 'image';

export type RequestUploadUrlPayload = {
  entry_id: string;
  filename: string;
  mime_type: string;
  file_size: number;
};

export type RequestUploadUrlResponse = {
  upload_url: string;
  gcs_path: string;
  gcs_bucket: string;
  media_id: string;
};

export type ConfirmMediaUploadPayload = {
  entry_id: string;
  purpose: MediaPurpose;
  gcs_path: string;
  gcs_bucket: string;
  mime_type: string;
  file_size: number;
  original_filename: string;
  type: MediaType;
  duration_seconds?: number | null;
  width?: number | null;
  height?: number | null;
};

export type ConfirmMediaUploadResponse = {
  id: string;
  entry_id: string | null;
  type: string;
  purpose: string | null;
  gcs_path: string;
  transcript_status: string;
};

/** POST /family-spaces/{familySpace}/media/upload-url */
export async function requestMediaUploadUrl(
  familySpaceId: string,
  payload: RequestUploadUrlPayload,
): Promise<RequestUploadUrlResponse> {
  return apiFetch<RequestUploadUrlResponse>(
    `/family-spaces/${encodeURIComponent(familySpaceId)}/media/upload-url`,
    { method: 'POST', body: payload },
  );
}

/** POST /family-spaces/{familySpace}/media (confirm upload) */
export async function confirmMediaUpload(
  familySpaceId: string,
  payload: ConfirmMediaUploadPayload,
): Promise<ConfirmMediaUploadResponse> {
  return apiFetch<ConfirmMediaUploadResponse>(
    `/family-spaces/${encodeURIComponent(familySpaceId)}/media`,
    { method: 'POST', body: payload },
  );
}

/** DELETE /family-spaces/{familySpace}/media/{mediaAttachment} */
export async function deleteMediaAttachment(
  familySpaceId: string,
  mediaId: string,
): Promise<void> {
  await apiFetch<void>(
    `/family-spaces/${encodeURIComponent(familySpaceId)}/media/${encodeURIComponent(mediaId)}`,
    { method: 'DELETE' },
  );
}

/** GET /family-spaces/{familySpace}/media/{mediaAttachment}/url — fresh signed URL. */
export async function getMediaUrl(
  familySpaceId: string,
  mediaId: string,
): Promise<{ url: string; expires_at: string }> {
  return apiFetch<{ url: string; expires_at: string }>(
    `/family-spaces/${encodeURIComponent(familySpaceId)}/media/${encodeURIComponent(mediaId)}/url`,
  );
}

/**
 * Upload the raw file bytes to a signed GCS URL.
 *
 * Routed through our own Next.js API route (`/api/media-upload-proxy`) so
 * the browser never has to talk cross-origin to `storage.googleapis.com`.
 * This sidesteps both (a) our app's CSP `connect-src` and (b) the GCS
 * bucket's CORS configuration.
 */
export async function uploadFileToSignedUrl(
  uploadUrl: string,
  file: File,
): Promise<void> {
  const form = new FormData();
  form.append('upload_url', uploadUrl);
  form.append('file', file, file.name);

  const res = await fetch('/api/media-upload-proxy', {
    method: 'POST',
    body: form,
  });

  // [CP2-diag] proxy PUT status — this is the least-tested, byte-moving step.
  console.log(`[CP2-diag] proxy PUT /api/media-upload-proxy — status=${res.status} ok=${res.ok} file=${file.name}`);

  if (!res.ok) {
    // Try to surface the underlying GCS error from the proxy.
    let detail = '';
    let rawBody = '';
    try {
      const data = await res.json();
      rawBody = JSON.stringify(data);
      detail = data?.error
        ? `${data.error}${data.body ? ` — ${String(data.body).slice(0, 200)}` : ''}`
        : '';
    } catch {
      rawBody = await res.text().catch(() => '');
      detail = rawBody;
    }
    // [CP2-diag] full response body on non-2xx proxy result.
    console.log(`[CP2-diag] proxy PUT failed body: ${rawBody}`);
    throw new Error(detail || `Upload failed (${res.status} ${res.statusText})`);
  }
}

/**
 * Read the duration (in seconds) of an audio File using a hidden
 * <audio> element. Returns null on failure or if the duration isn't a
 * finite number (some WebM/OGG blobs report Infinity until fully played).
 */
export function readAudioDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }
    const url = URL.createObjectURL(file);
    const audio = document.createElement('audio');
    const done = (value: number | null) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      const d = audio.duration;
      if (Number.isFinite(d) && d > 0) {
        done(Math.round(d));
      } else {
        done(null);
      }
    };
    audio.onerror = () => done(null);
    audio.src = url;
  });
}

/** Read the natural width/height of an image File. Returns nulls on failure. */
export function readImageDimensions(
  file: File,
): Promise<{ width: number | null; height: number | null }> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve({ width: null, height: null });
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth || null, height: img.naturalHeight || null });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ width: null, height: null });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

/** Read duration + dimensions from a video File. Returns nulls on failure. */
export function readVideoMetadata(
  file: File,
): Promise<{
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
}> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve({ durationSeconds: null, width: null, height: null });
      return;
    }
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    const done = (value: {
      durationSeconds: number | null;
      width: number | null;
      height: number | null;
    }) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const d = video.duration;
      done({
        durationSeconds: Number.isFinite(d) && d > 0 ? Math.round(d) : null,
        width: video.videoWidth || null,
        height: video.videoHeight || null,
      });
    };
    video.onerror = () => done({ durationSeconds: null, width: null, height: null });
    video.src = url;
  });
}

/**
 * High-level helper: upload a photo File and attach it to an existing
 * kinloom. Runs the full 3-step flow: request URL → PUT to GCS → confirm.
 */
export async function uploadKinloomPhoto(
  familySpaceId: string,
  kinloomId: string,
  file: File,
  options: { width?: number | null; height?: number | null } = {},
): Promise<ConfirmMediaUploadResponse> {
  // [CP2-diag] upload-url request — apiFetch throws on non-2xx, so reaching
  // the log below means the request succeeded; failures are logged in the
  // catch block up in handleSave with the ApiError's real status.
  console.log(`[CP2-diag] requesting upload-url — entry_id=${kinloomId} file=${file.name}`);
  const { upload_url, gcs_path, gcs_bucket } = await requestMediaUploadUrl(
    familySpaceId,
    {
      entry_id: kinloomId,
      filename: file.name,
      mime_type: file.type,
      file_size: file.size,
    },
  );
  console.log(`[CP2-diag] upload-url ok — upload_url=${!!upload_url} gcs_path=${gcs_path}`);

  await uploadFileToSignedUrl(upload_url, file);

  const { width, height } = options.width !== undefined && options.height !== undefined
    ? options
    : await readImageDimensions(file);

  console.log(`[CP2-diag] confirming media — entry_id=${kinloomId} gcs_path=${gcs_path}`);
  const confirmed = await confirmMediaUpload(familySpaceId, {
    entry_id: kinloomId,
    purpose: 'photo',
    gcs_path,
    gcs_bucket,
    mime_type: file.type,
    file_size: file.size,
    original_filename: file.name,
    type: 'image',
    width,
    height,
  });
  console.log(
    `[CP2-diag] confirm ok — media.id=${confirmed.id} media.entry_id=${confirmed.entry_id} matchesRequestedEntryId=${confirmed.entry_id === kinloomId}`,
  );
  // show responses omit attachment ids; cache folder→id for later deletes
  rememberMediaAttachmentFromGcsPath(gcs_path, confirmed.id);
  return confirmed;
}

/**
 * High-level helper: upload a video File and attach it to an existing
 * kinloom. Same 3-step flow as photos. Confirm uses `purpose: "photo"`
 * (API enum has no `video` purpose) + `type: "video"`; the attachment
 * lands in the kinloom's `photos` array.
 */
export async function uploadKinloomVideo(
  familySpaceId: string,
  kinloomId: string,
  file: File,
  options: {
    durationSeconds?: number | null;
    width?: number | null;
    height?: number | null;
  } = {},
): Promise<ConfirmMediaUploadResponse> {
  const mime = file.type;
  if (!(VIDEO_MIME_TYPES as readonly string[]).includes(mime)) {
    throw new Error(`Video mime "${mime}" is not accepted by the API.`);
  }

  const { upload_url, gcs_path, gcs_bucket } = await requestMediaUploadUrl(
    familySpaceId,
    {
      entry_id: kinloomId,
      filename: file.name,
      mime_type: mime,
      file_size: file.size,
    },
  );

  await uploadFileToSignedUrl(upload_url, file);

  let duration = options.durationSeconds ?? null;
  let width = options.width ?? null;
  let height = options.height ?? null;
  if (duration == null || width == null || height == null) {
    const meta = await readVideoMetadata(file);
    duration = duration ?? meta.durationSeconds;
    width = width ?? meta.width;
    height = height ?? meta.height;
  }

  const confirmed = await confirmMediaUpload(familySpaceId, {
    entry_id: kinloomId,
    // Docs only allow audio|photo; video lives under photo purpose.
    purpose: 'photo',
    gcs_path,
    gcs_bucket,
    mime_type: mime,
    file_size: file.size,
    original_filename: file.name,
    type: 'video',
    duration_seconds: duration,
    width,
    height,
  });
  rememberMediaAttachmentFromGcsPath(gcs_path, confirmed.id);
  return confirmed;
}

/**
 * High-level helper: upload an audio File and attach it to an existing
 * kinloom. Accepts an optional `durationSeconds` override — useful when
 * we already tracked the recording length in the UI (more reliable than
 * reading it back from some MediaRecorder blobs).
 */
export async function uploadKinloomAudio(
  familySpaceId: string,
  kinloomId: string,
  file: File,
  options: { durationSeconds?: number | null } = {},
): Promise<ConfirmMediaUploadResponse> {
  const mime = file.type;
  if (!(AUDIO_MIME_TYPES as readonly string[]).includes(mime)) {
    throw new Error(`Audio mime "${mime}" is not accepted by the API.`);
  }

  const { upload_url, gcs_path, gcs_bucket } = await requestMediaUploadUrl(
    familySpaceId,
    {
      entry_id: kinloomId,
      filename: file.name,
      mime_type: mime,
      file_size: file.size,
    },
  );

  await uploadFileToSignedUrl(upload_url, file);

  let duration = options.durationSeconds ?? null;
  if (duration == null) {
    duration = await readAudioDuration(file);
  }

  const confirmed = await confirmMediaUpload(familySpaceId, {
    entry_id: kinloomId,
    purpose: 'audio',
    gcs_path,
    gcs_bucket,
    mime_type: mime,
    file_size: file.size,
    original_filename: file.name,
    type: 'audio',
    duration_seconds: duration,
  });
  rememberMediaAttachmentFromGcsPath(gcs_path, confirmed.id);
  return confirmed;
}

/**
 * Re-create a kinloom with a new media set. Used when edit needs to drop
 * media whose MediaAttachment ids aren't available from `kinloom.show`.
 * Returns the new kinloom ulid. Caller should delete the old row after.
 */
export async function cloneKinloomWithMedia(
  familySpaceId: string,
  source: Pick<Kinloom, 'type_slug' | 'title'>,
  options: {
    title: string;
    body: string;
    visibility: Visibility;
    tagged_member_ids: string[];
    keptPhotoUrls: string[];
    newPhotos: { file: File; width?: number | null; height?: number | null }[];
    /** Existing audio URL to copy, or null to omit. */
    keepAudioUrl: string | null;
    /** Replacement / new voice file. Wins over keepAudioUrl when set. */
    newAudio?: { file: File; durationSeconds?: number | null } | null;
  },
): Promise<Kinloom> {
  const created = await createKinloom(familySpaceId, {
    type_slug: source.type_slug,
    title: options.title,
    body: options.body,
    visibility: options.visibility,
    status: 'draft',
    tagged_member_ids: options.tagged_member_ids,
  });

  try {
    for (const url of options.keptPhotoUrls) {
      const file = await fileFromRemoteUrl(url, 'photo');
      await uploadKinloomPhoto(familySpaceId, created.ulid, file);
    }
    for (const item of options.newPhotos) {
      await uploadKinloomPhoto(familySpaceId, created.ulid, item.file, {
        width: item.width,
        height: item.height,
      });
    }

    if (options.newAudio?.file) {
      await uploadKinloomAudio(familySpaceId, created.ulid, options.newAudio.file, {
        durationSeconds: options.newAudio.durationSeconds,
      });
    } else if (options.keepAudioUrl) {
      const file = await fileFromRemoteUrl(options.keepAudioUrl, 'audio');
      await uploadKinloomAudio(familySpaceId, created.ulid, file);
    }

    return updateKinloom(familySpaceId, created.ulid, { status: 'published' });
  } catch (err) {
    // Best-effort cleanup of the draft we just created.
    try {
      await deleteKinloom(familySpaceId, created.ulid);
    } catch {
      // ignore
    }
    throw err;
  }
}

async function fileFromRemoteUrl(url: string, kind: 'photo' | 'audio'): Promise<File> {
  // Route through our BFF — browser→GCS GET is CORS-blocked.
  const res = await fetch('/api/media-fetch-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    throw new Error(`Could not copy existing ${kind} (${res.status}).`);
  }
  const blob = await res.blob();
  const ref = url.split('?')[0] ?? url;
  const name = decodeURIComponent(ref.split('/').pop() || (kind === 'photo' ? 'photo.jpg' : 'audio.bin'));
  const type = blob.type
    || (kind === 'photo' ? 'image/jpeg' : 'audio/mpeg');
  return new File([blob], name, { type });
}
