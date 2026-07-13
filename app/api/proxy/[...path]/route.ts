/**
 * Catch-all BFF proxy for client-side API calls (Epic 1: Firebase-backed).
 *
 *   Browser  →  GET /api/proxy/family-spaces/X/library
 *   Next     →  reads kinloom_id_token cookie, attaches Bearer
 *           →  forwards to Laravel
 *
 * Why a BFF at all (not a Next rewrite to Laravel)?
 *
 *   • Same-origin requests sidestep CORS for the Laravel host.
 *   • CSP can stay as `connect-src 'self' ...` instead of having to
 *     allowlist the Laravel origin in every browser.
 *   • The Firebase Web SDK doesn't need to be imported into every
 *     module that calls an API — the BFF reads the short-lived ID
 *     token cookie (kept fresh by lib/auth-context.tsx's
 *     onIdTokenChanged listener). If the cookie is stale, the
 *     server-side resolver mints a fresh ID token via custom-token
 *     exchange. Either way, the browser never has to think about it.
 *
 * Multipart uploads are streamed as-is (we don't buffer or parse).
 */

import { NextResponse, type NextRequest } from 'next/server';
import { SERVER_API_BASE, resolveBearerForProxy } from '../../../../lib/server/api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
type Method = typeof ALLOWED_METHODS[number];

async function handle(
  req: NextRequest,
  params: { path: string[] },
): Promise<NextResponse> {
  const method = req.method.toUpperCase() as Method;
  if (!(ALLOWED_METHODS as readonly string[]).includes(method)) {
    return NextResponse.json({ message: 'Method not allowed.' }, { status: 405 });
  }

  const pathSegments = params.path?.map(encodeURIComponent).join('/') ?? '';
  const search = req.nextUrl.search;
  const target = `${SERVER_API_BASE}/${pathSegments}${search}`;

  const anonymous = req.headers.get('x-kinloom-anonymous') === '1';

  const headers = new Headers();
  const ct = req.headers.get('content-type');
  const accept = req.headers.get('accept');
  if (ct) headers.set('Content-Type', ct);
  headers.set('Accept', accept || 'application/json');
  if (!anonymous) {
    const bearer = await resolveBearerForProxy();
    if (bearer) headers.set('Authorization', `Bearer ${bearer}`);
  }

  // GET never carries a body. Everything else — including DELETE, which may
  // send a JSON body like { convert_to_non_user: true } — forwards the request
  // body when one is present. An empty body forwards as null so plain removals
  // (DELETE with no body) stay clean. Content-Type is passed through above, so
  // the JSON case reaches Laravel with the right header.
  let body: ArrayBuffer | null = null;
  if (method !== 'GET') {
    const buf = await req.arrayBuffer();
    body = buf.byteLength > 0 ? buf : null;
  }

  const upstream = await fetch(target, {
    method,
    headers,
    body,
    cache: 'no-store',
    redirect: 'manual',
  });

  const respHeaders = new Headers();
  const passthrough = ['content-type', 'content-disposition', 'content-length', 'cache-control'];
  for (const h of passthrough) {
    const v = upstream.headers.get(h);
    if (v) respHeaders.set(h, v);
  }
  const buf = await upstream.arrayBuffer();
  return new NextResponse(buf, { status: upstream.status, headers: respHeaders });
}

export async function GET(req: NextRequest, ctx: { params: { path: string[] } }) {
  return handle(req, ctx.params);
}
export async function POST(req: NextRequest, ctx: { params: { path: string[] } }) {
  return handle(req, ctx.params);
}
export async function PUT(req: NextRequest, ctx: { params: { path: string[] } }) {
  return handle(req, ctx.params);
}
export async function PATCH(req: NextRequest, ctx: { params: { path: string[] } }) {
  return handle(req, ctx.params);
}
export async function DELETE(req: NextRequest, ctx: { params: { path: string[] } }) {
  return handle(req, ctx.params);
}
