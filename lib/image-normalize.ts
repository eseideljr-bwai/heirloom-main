/**
 * HEIC/HEIF photos → JPEG, in the browser, before upload.
 *
 * The API accepts only JPEG, PNG, GIF and WebP for photos and avatars, and
 * checks the stored bytes, so a HEIC file has to be converted, not relabelled.
 * iPhone pickers usually hand the browser a JPEG already; this is for the
 * HEIC files that reach the page anyway (desktop, AirDrop, Photos exports).
 *
 * Decoding: Safari 17+ decodes HEIC natively (createImageBitmap). Everywhere
 * else, `heic-to` (libheif compiled to JavaScript, LGPL-3.0) is loaded on
 * demand, so the ~3 MB decoder is only downloaded by someone who picks a HEIC
 * file. We import its `/csp` build: the default build uses `new Function`,
 * which the app's production CSP forbids. It decodes in a `blob:` Web Worker,
 * which the CSP allows via `worker-src 'self' blob:` (middleware.ts).
 *
 * Every converted photo is redrawn on a canvas, which (1) applies the photo's
 * rotation so it uploads upright, (2) caps the long edge so 48 MP originals
 * don't exhaust a phone's memory or the 10 MB limit, and (3) drops metadata
 * (date taken, location, camera).
 */

/** Longest edge of a converted photo, in pixels. */
const MAX_EDGE = 4000;
const JPEG_QUALITY = 0.9;

/** HEIC/HEIF picker types, for `accept=` alongside the types the API takes. */
export const HEIC_ACCEPT = 'image/heic,image/heif,.heic,.heif';

/** By MIME type or extension: Chrome often reports an empty `type` for HEIC. */
export function isHeicFile(file: File): boolean {
  return /^image\/hei[cf](-sequence)?$/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
}

const unreadable = (name: string) =>
  `We couldn’t read “${name}”. Try saving it as a JPEG and adding it again.`;

async function decode(file: File): Promise<ImageBitmap> {
  // Safari decodes HEIC itself; other browsers reject, and we load the decoder.
  const native = await createImageBitmap(file).catch(() => null);
  if (native) return native;
  const { heicTo } = await import('heic-to/csp');
  return heicTo({ blob: file, type: 'bitmap' });
}

/**
 * A JPEG `File` for HEIC/HEIF input; any other file is returned unchanged.
 * Throws an Error with a message fit to show the member.
 */
export async function normalizeImageFile(file: File): Promise<File> {
  if (!isHeicFile(file)) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await decode(file);
  } catch {
    throw new Error(unreadable(file.name));
  }

  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const jpeg = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
    if (!jpeg) throw new Error('toBlob returned null');
    // Release the canvas's pixel memory now rather than at GC.
    canvas.width = 0;
    canvas.height = 0;

    const name = `${file.name.replace(/\.(heic|heif)$/i, '') || 'photo'}.jpg`;
    return new File([jpeg], name, { type: 'image/jpeg', lastModified: file.lastModified });
  } catch {
    throw new Error(unreadable(file.name));
  } finally {
    bitmap.close();
  }
}

/**
 * Normalise a picked batch, one file at a time (decoding is memory-heavy).
 * Files that can't be converted are left out and explained in `errors`; the
 * rest go on to the picker's usual type and size checks.
 */
export async function prepareImageFiles(files: File[]): Promise<{ files: File[]; errors: string[] }> {
  const out: File[] = [];
  const errors: string[] = [];
  for (const file of files) {
    try {
      out.push(await normalizeImageFile(file));
    } catch (err) {
      errors.push(err instanceof Error ? err.message : unreadable(file.name));
    }
  }
  return { files: out, errors };
}

/** True when a batch needs conversion, so the picker can show "Preparing…". */
export const needsPreparing = (files: File[]): boolean => files.some(isHeicFile);
