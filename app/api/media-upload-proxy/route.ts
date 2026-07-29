/**
 * Server-side proxy for GCS signed-URL uploads.
 *
 * Why this exists: PUTting directly from the browser to a signed
 * `storage.googleapis.com` URL trips both (a) our app's CSP `connect-src`
 * and (b) the bucket's per-origin CORS config. By POSTing the file to
 * this same-origin route and re-PUTting server-side, neither check
 * applies — Node has no CORS, and CSP only governs the browser.
 *
 * The browser sends a multipart form with two fields:
 *   - `upload_url`: the signed GCS URL we got from /media/upload-url
 *   - `file`:       the raw file blob
 *
 * Returns 204 on success, or `{ error, status, body }` JSON on failure
 * so the client can surface the underlying GCS response.
 */

import { NextResponse } from 'next/server';

// Body size on Next.js route handlers defaults are fine; for very large
// uploads consider streaming. Photos are ~10MB so multipart is OK.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid multipart body', detail: String(err) },
      { status: 400 },
    );
  }

  const uploadUrl = form.get('upload_url');
  const file = form.get('file');

  if (typeof uploadUrl !== 'string' || !uploadUrl) {
    return NextResponse.json({ error: 'Missing upload_url' }, { status: 400 });
  }
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  }

  // Defense in depth: only allow proxying to Google Cloud Storage hosts.
  // Without this, anyone could use our server as an open relay to PUT
  // arbitrary bytes anywhere.
  let parsed: URL;
  try {
    parsed = new URL(uploadUrl);
  } catch {
    return NextResponse.json({ error: 'upload_url is not a valid URL' }, { status: 400 });
  }
  const host = parsed.hostname;
  const isGcs =
    host === 'storage.googleapis.com' ||
    host.endsWith('.storage.googleapis.com');
  if (parsed.protocol !== 'https:' || !isGcs) {
    return NextResponse.json(
      { error: 'upload_url must point to *.storage.googleapis.com over HTTPS' },
      { status: 400 },
    );
  }

  const contentType = file.type || 'application/octet-stream';

  let upstream: Response;
  try {
    upstream = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: file,
      // Avoid Next/undici stalling on large bodies.
      // @ts-expect-error – `duplex` is required by undici for streamed bodies.
      duplex: 'half',
    });
  } catch (err) {
    console.error('[media-upload-proxy] PUT failed', err);
    return NextResponse.json(
      { error: 'Network error PUTting to GCS', detail: String(err) },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    const bodyText = await upstream.text().catch(() => '');
    console.error('[media-upload-proxy] GCS rejected upload', upstream.status, bodyText);
    return NextResponse.json(
      {
        error: `GCS rejected upload (${upstream.status} ${upstream.statusText})`,
        status: upstream.status,
        body: bodyText,
      },
      { status: 502 },
    );
  }

  return new NextResponse(null, { status: 204 });
}
