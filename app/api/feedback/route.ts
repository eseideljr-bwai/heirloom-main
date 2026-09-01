/**
 * POST /api/feedback
 *
 * Same-origin BFF. The browser never talks to Cloud Functions directly.
 * We verify the session, then forward the report + screenshot to
 * feedback-ingest with the caller's Firebase ID token.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { COOKIES } from '../../../lib/server/cookies';
import { verifySession } from '../../../lib/server/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const INGEST_URL = process.env.FEEDBACK_INGEST_URL;
const MAX_SCREENSHOT_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

function ingestUrl(): string | null {
  return INGEST_URL && INGEST_URL.length > 0 ? INGEST_URL : null;
}

export async function POST(request: Request): Promise<NextResponse> {
  const session = await verifySession();
  const idToken = cookies().get(COOKIES.idToken)?.value;
  if (!session || !idToken) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const dest = ingestUrl();
  if (!dest) {
    return NextResponse.json(
      { error: 'Feedback ingest is not configured.' },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid multipart body.' }, { status: 400 });
  }

  const rawReport = form.get('report');
  if (typeof rawReport !== 'string' || !rawReport) {
    return NextResponse.json({ error: 'report is required.' }, { status: 400 });
  }

  let report: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(rawReport);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return NextResponse.json({ error: 'report must be an object.' }, { status: 400 });
    }
    report = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'report is not valid JSON.' }, { status: 400 });
  }

  const screenshot = form.get('screenshot');
  let screenshotBase64: string | undefined;
  let screenshotContentType: string | undefined;

  if (screenshot instanceof File && screenshot.size > 0) {
    if (screenshot.size > MAX_SCREENSHOT_BYTES) {
      return NextResponse.json({ error: 'Screenshot is too large.' }, { status: 413 });
    }
    if (!ALLOWED_IMAGE_TYPES.has(screenshot.type)) {
      return NextResponse.json(
        { error: 'Screenshot must be png, jpeg, or webp.' },
        { status: 400 },
      );
    }
    const bytes = Buffer.from(await screenshot.arrayBuffer());
    screenshotBase64 = bytes.toString('base64');
    screenshotContentType = screenshot.type;
  }

  let upstream: Response;
  try {
    upstream = await fetch(dest, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...report,
        screenshot_base64: screenshotBase64,
        screenshot_content_type: screenshotContentType,
      }),
    });
  } catch {
    return NextResponse.json(
      { error: 'Could not reach the feedback service.' },
      { status: 502 },
    );
  }

  let payload: unknown;
  try {
    payload = await upstream.json();
  } catch {
    return NextResponse.json(
      { error: 'Feedback service returned an invalid response.' },
      { status: 502 },
    );
  }

  return NextResponse.json(payload, { status: upstream.status });
}
