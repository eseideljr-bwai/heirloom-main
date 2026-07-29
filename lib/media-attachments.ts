/**
 * Media attachment id helpers.
 *
 * `kinloom.show` returns signed URLs whose path contains the *upload*
 * folder id (`…/media/{folder}/file`), but DELETE /media/{id} needs the
 * *MediaAttachment* primary key returned by confirm — a different ULID.
 *
 * Until the API includes `id` on photo/audio in show, we:
 *   1. Prefer an explicit `id` on the media object when present
 *   2. Fall back to a localStorage map populated at upload/confirm time
 *   3. Let the edit UI republish the kinloom when a removal has no id
 */

const STORAGE_KEY = 'kinloom:media-attachment-ids';

export type GcsMediaRef = {
  bucket: string;
  gcsPath: string;
  folderId: string;
  filename: string;
};

/** Parse bucket/path/folder from a GCS signed download URL. */
export function parseGcsMediaRef(url: string | null | undefined): GcsMediaRef | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (!u.hostname.includes('storage.googleapis.com')) return null;
    const parts = u.pathname.split('/').filter(Boolean);
    // /{bucket}/family-spaces/{space}/media/{folder}/{filename}
    const mediaIdx = parts.indexOf('media');
    if (mediaIdx < 1 || mediaIdx + 2 >= parts.length) return null;
    const bucket = parts[0];
    const folderId = parts[mediaIdx + 1];
    const filename = decodeURIComponent(parts[mediaIdx + 2] ?? '');
    if (!bucket || !folderId || !filename) return null;
    return {
      bucket,
      gcsPath: parts.slice(1).map(decodeURIComponent).join('/'),
      folderId,
      filename,
    };
  } catch {
    return null;
  }
}

function readMap(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof k === 'string' && typeof v === 'string' && v) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, string>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // quota / private mode — ignore
  }
}

/** Remember confirm.id for a GCS folder so later deletes can resolve it. */
export function rememberMediaAttachment(folderId: string, attachmentId: string) {
  if (!folderId || !attachmentId) return;
  const map = readMap();
  map[folderId] = attachmentId;
  // Also store lowercase — ULIDs in URLs are often uppercased.
  map[folderId.toLowerCase()] = attachmentId;
  writeMap(map);
}

export function rememberMediaAttachmentFromGcsPath(
  gcsPath: string | null | undefined,
  attachmentId: string,
) {
  if (!gcsPath || !attachmentId) return;
  const m = gcsPath.match(/\/media\/([^/]+)\//i);
  if (m?.[1]) rememberMediaAttachment(m[1], attachmentId);
}

export function lookupMediaAttachment(folderId: string | null | undefined): string | null {
  if (!folderId) return null;
  const map = readMap();
  return map[folderId] || map[folderId.toLowerCase()] || null;
}

/** Resolve a deletable MediaAttachment id from a media object + optional URL. */
export function resolveMediaAttachmentId(media: {
  id?: string | null;
  url?: string | null;
} | null | undefined): string | null {
  if (!media) return null;
  const explicit = typeof media.id === 'string' && media.id.trim() ? media.id.trim() : null;
  if (explicit) return explicit;
  const ref = parseGcsMediaRef(media.url);
  return lookupMediaAttachment(ref?.folderId ?? null);
}
