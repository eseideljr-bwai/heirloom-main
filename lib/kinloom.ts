/**
 * Kinloom API client (Phase 3 social graph).
 *
 * A kinloom belongs to its author and lives in their Vault. Publishing it is
 * a separate, revocable record to a Family Home and/or Family Spaces
 * (`/kinlooms/{id}/publications`). Nothing here takes a family-space id any
 * more: the API decides who can read what.
 *
 * Calls are typed from the generated OpenAPI contract (`lib/api-schema`).
 */

import { kinloomApi } from './kinloom-api';
import type { components } from './api-schema/typed';

// ─── Types ──────────────────────────────────────────────────────────

type Schemas = components['schemas'];

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

/** Draft stays in the author's Vault; final can be published to rooms. */
export type KinloomStatus = Schemas['KinloomStatus'];
export type PublishWhen = Schemas['PublishWhen'];
export type RoomType = Schemas['RoomType'];
export type PublicationTarget = Schemas['PublicationTarget'];
export type RoomOption = Schemas['RoomOption'];
export type PublicationRoom = Schemas['KinloomPublicationRoom'];
export type KinloomPublications = Schemas['KinloomPublications'];
export type ReachResult = Schemas['ReachResult'];
export type KinloomDetail = Schemas['KinloomDetail'];
export type KinloomMediaItem = Schemas['MediaItem'];
export type KinloomComment = Schemas['Comment'];
export type PersonCard = Schemas['PersonCard'];
export type PersonOrNameOnly = Schemas['PersonOrNameOnly'];
export type CreateKinloomBody = Schemas['KinloomCreateRequest'];
export type UpdateKinloomBody = Schemas['KinloomUpdateRequest'];
export type UploadLimits = Schemas['CreateContextUploadLimits'];

/** A taggable person, shaped for the composer's tag picker. */
export type TaggableMember = {
  /** The person's id (what `tagged_member_ids` takes). */
  member_id: string;
  name: string;
  role_label: string | null;
  kin_term: string | null;
  gender: 'f' | 'm' | 'n' | string;
  tone: string;
  initials: string | null;
  deceased: boolean;
};

export type CreateContext = {
  type: KinloomType;
  taggableMembers: TaggableMember[];
  rooms: RoomOption[];
  defaultPublishTarget: Schemas['DefaultPublishTarget'];
  uploadLimits: UploadLimits;
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
  id?: string | null;
  url: string | null;
  duration_seconds?: number | string | null;
  transcript_text?: string | null;
  width?: number | string | null;
  height?: number | string | null;
  type?: string | null;
};

/** Max files per kinloom — the API allows 20; the composer keeps photos+videos to 10. */
export const MAX_KINLOOM_PHOTOS = 10;
/** Soft per-photo cap used by the client picker (API allows up to 500 MB). */
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

/**
 * Row shape the not-yet-rewired list screens (Home, Library, Family, Portrait,
 * Tapestry) still read. Those move to the Phase 3 `KinloomCard` with their
 * own rewiring; this goes away with the last of them.
 */
type LegacyKinloom = {
  ulid: string;
  type_slug: string;
  type_label: string;
  title: string;
  body_paragraphs: string[] | Record<string, unknown> | unknown[];
  created_at: string;
  visibility: string;
  author: KinloomAuthor | null;
  audio: KinloomMedia | null;
  photo: KinloomMedia | null;
  photos?: KinloomMedia[] | string;
  tagged_kin: TaggableMember[] | string;
  hold: { held_by_me: boolean; count: number };
  comments: unknown;
};

/** A row as returned from the old library list endpoint. */
export type LibraryRow = Partial<LegacyKinloom> & {
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


// ─── Kinloom endpoints ──────────────────────────────────────────────

/** Adapt a Phase 3 person card to the composer's tag-picker shape. */
export function personToTaggable(p: PersonCard): TaggableMember {
  return {
    member_id: p.id,
    name: p.name,
    role_label: p.label,
    kin_term: null,
    gender: p.gender,
    tone: p.tone,
    initials: p.initials,
    deceased: p.deceased,
  };
}

/** The `room` query value for a room: `home:ID` / `space:ID`. */
export function roomKey(room: { type: RoomType; id: string }): string {
  return `${room.type}:${room.id}`;
}

/** GET /create-context/{typeSlug} */
export async function getCreateContext(typeSlug: string): Promise<CreateContext> {
  const res = await kinloomApi.get('/create-context/{typeSlug}', { path: { typeSlug } });
  return {
    type: res.type,
    taggableMembers: res.taggable_people.map(personToTaggable),
    rooms: res.rooms,
    defaultPublishTarget: res.default_publish_target,
    uploadLimits: res.upload_limits,
  };
}

/** POST /kinlooms — a draft stays in the Vault; `final` can carry `publish`. */
export async function createKinloom(body: CreateKinloomBody): Promise<KinloomDetail> {
  return kinloomApi.post('/kinlooms', { body });
}

/** PATCH /kinlooms/{id} — send only what changed. */
export async function updateKinloom(
  kinloomId: string,
  body: UpdateKinloomBody,
): Promise<KinloomDetail> {
  return kinloomApi.patch('/kinlooms/{kinloom}', { path: { kinloom: kinloomId }, body });
}

/** DELETE /kinlooms/{id} — removes its publications, comments and holds too. */
export async function deleteKinloom(kinloomId: string): Promise<void> {
  await kinloomApi.delete('/kinlooms/{kinloom}', { path: { kinloom: kinloomId } });
}

/** GET /kinlooms/{id}/publications — every room you could publish to, with its state. */
export async function getKinloomPublications(kinloomId: string): Promise<KinloomPublications> {
  return kinloomApi.get('/kinlooms/{kinloom}/publications', { path: { kinloom: kinloomId } });
}

/** PUT /kinlooms/{id}/publications — replaces the set; `[]` makes it private. */
export async function setKinloomPublications(
  kinloomId: string,
  targets: PublicationTarget[],
): Promise<KinloomPublications> {
  return kinloomApi.put('/kinlooms/{kinloom}/publications', {
    path: { kinloom: kinloomId },
    body: { targets },
  });
}

/** GET /reach — how many accounts could read it if published to these rooms. */
export async function getReach(targets: { type: RoomType; id: string }[]): Promise<ReachResult> {
  return kinloomApi.get('/reach', {
    query: targets.length > 0 ? { targets: targets.map(roomKey).join(',') } : {},
  });
}

/** POST /kinlooms/{id}/comments — into one room's thread. */
export async function addComment(
  kinloomId: string,
  room: { type: RoomType; id: string },
  body: string,
): Promise<KinloomComment> {
  return kinloomApi.post('/kinlooms/{kinloom}/comments', {
    path: { kinloom: kinloomId },
    body: { room: { type: room.type, id: room.id }, body },
  });
}

/** DELETE /kinlooms/{id}/comments/{comment} */
export async function deleteComment(kinloomId: string, commentId: string): Promise<void> {
  await kinloomApi.delete('/kinlooms/{kinloom}/comments/{comment}', {
    path: { kinloom: kinloomId, comment: commentId },
  });
}

/** POST /kinlooms/{id}/hold — toggles your hold in one room. */
export async function toggleHold(
  kinloomId: string,
  room: { type: RoomType; id: string },
): Promise<{ held_by_me: boolean; count: number }> {
  return kinloomApi.post('/kinlooms/{kinloom}/hold', {
    path: { kinloom: kinloomId },
    body: { room: { type: room.type, id: room.id } },
  });
}

/** Normalize `body_paragraphs` (which the spec types as array|object|array<string>). */
export function bodyParagraphs(body: string[] | string | Record<string, unknown> | unknown[] | null | undefined): string[] {
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

// ─── Media uploads ──────────────────────────────────────────────────

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

/** 500 MB — matches the largest `max_bytes` the API will grant. */
export const MAX_UPLOAD_BYTES = 524_288_000;

export type MediaPurpose = Schemas['MediaPurpose'];

/** DELETE /media/{id} — removes one file from its kinloom and from storage. */
export async function deleteMedia(mediaId: string): Promise<void> {
  await kinloomApi.delete('/media/{media}', { path: { media: mediaId } });
}

/** GET /media/{id}/url — a fresh signed URL for a page that outlived the old one. */
export async function getMediaUrl(mediaId: string): Promise<{ url: string; expires_at: string }> {
  return kinloomApi.get('/media/{media}/url', { path: { media: mediaId } });
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


type AcceptedMime = Schemas['MediaUploadUrlRequest']['mime_type'];

/**
 * Upload one file and attach it to a kinloom of yours. Three steps
 * (contract §6.3): declare it, PUT the bytes, confirm. The server derives the
 * media type from the MIME type and picks the storage path.
 */
async function uploadKinloomMedia(
  kinloomId: string,
  file: File,
  purpose: MediaPurpose,
  meta: { durationSeconds?: number | null; width?: number | null; height?: number | null },
): Promise<KinloomMediaItem> {
  const { media_id, upload_url } = await kinloomApi.post('/media/upload-url', {
    body: {
      purpose,
      filename: file.name,
      mime_type: file.type as AcceptedMime,
      file_size: file.size,
    },
  });

  await uploadFileToSignedUrl(upload_url, file);

  return kinloomApi.post('/media', {
    body: {
      media_id,
      kinloom_id: kinloomId,
      duration_seconds: meta.durationSeconds ?? null,
      width: meta.width ?? null,
      height: meta.height ?? null,
    },
  });
}

/** Upload a photo File and attach it to an existing kinloom. */
export async function uploadKinloomPhoto(
  kinloomId: string,
  file: File,
  options: { width?: number | null; height?: number | null } = {},
): Promise<KinloomMediaItem> {
  const dims = options.width !== undefined && options.height !== undefined
    ? options
    : await readImageDimensions(file);
  return uploadKinloomMedia(kinloomId, file, 'photo', dims);
}

/** Upload a video File and attach it to an existing kinloom. */
export async function uploadKinloomVideo(
  kinloomId: string,
  file: File,
  options: {
    durationSeconds?: number | null;
    width?: number | null;
    height?: number | null;
  } = {},
): Promise<KinloomMediaItem> {
  if (!(VIDEO_MIME_TYPES as readonly string[]).includes(file.type)) {
    throw new Error(`Video mime "${file.type}" is not accepted by the API.`);
  }
  let { durationSeconds, width, height } = options;
  if (durationSeconds == null || width == null || height == null) {
    const meta = await readVideoMetadata(file);
    durationSeconds = durationSeconds ?? meta.durationSeconds;
    width = width ?? meta.width;
    height = height ?? meta.height;
  }
  return uploadKinloomMedia(kinloomId, file, 'video', { durationSeconds, width, height });
}

/**
 * Upload an audio File and attach it to an existing kinloom. `durationSeconds`
 * is optional: when the UI tracked the recording length it is more reliable
 * than reading it back from some MediaRecorder blobs.
 */
export async function uploadKinloomAudio(
  kinloomId: string,
  file: File,
  options: { durationSeconds?: number | null } = {},
): Promise<KinloomMediaItem> {
  if (!(AUDIO_MIME_TYPES as readonly string[]).includes(file.type)) {
    throw new Error(`Audio mime "${file.type}" is not accepted by the API.`);
  }
  const durationSeconds = options.durationSeconds ?? (await readAudioDuration(file));
  return uploadKinloomMedia(kinloomId, file, 'audio', { durationSeconds });
}

/** True for a video attachment (by type, falling back to the URL extension). */
export function isVideoMedia(media: { type?: string | null; url?: string | null } | null | undefined): boolean {
  if (!media) return false;
  if (media.type) return media.type === 'video';
  return isVideoMediaUrl(media.url);
}
