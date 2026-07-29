/**
 * Server-side proxy to download a GCS signed URL as bytes.
 *
 * Used when editing a kinloom needs to copy existing media onto a
 * republished row (API show omits MediaAttachment ids, so removals
 * sometimes require clone+reupload). Browser fetch to
 * storage.googleapis.com is blocked by CORS; this route avoids that.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '../../../lib/server/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isAllowedGcsUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:') return false;
    return (
      u.hostname === 'storage.googleapis.com' ||
      u.hostname.endsWith('.storage.googleapis.com')
    );
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let url: string | null = null;
  try {
    const body = await req.json();
    url = typeof body?.url === 'string' ? body.url : null;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!url || !isAllowedGcsUrl(url)) {
    return NextResponse.json(
      { error: 'url must be an https storage.googleapis.com signed URL' },
      { status: 400 },
    );
  }

  const upstream = await fetch(url, { method: 'GET', cache: 'no-store' });
  if (!upstream.ok) {
    return NextResponse.json(
      { error: `Upstream fetch failed (${upstream.status})` },
      { status: 502 },
    );
  }

  const buf = Buffer.from(await upstream.arrayBuffer());
  const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
  const filename = decodeURIComponent(
    (url.split('?')[0] ?? '').split('/').pop() || 'media.bin',
  );

  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename.replace(/"/g, '')}"`,
      'Cache-Control': 'no-store',
    },
  });
}
