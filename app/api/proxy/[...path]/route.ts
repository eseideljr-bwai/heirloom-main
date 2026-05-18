/**
 * Catch-all BFF proxy for any client-side API call that isn't auth-related.
 *
 *   Browser  →  GET /api/proxy/family-spaces/X/library
 *   Next     →  reads kinloom_id_token cookie, adds Bearer header
 *            →  forwards to https://kinloom-api.../api/family-spaces/X/library
 *
 * Why a BFF and not a rewrite? Because Next.js `rewrites()` can't read or
 * mutate cookies. Tokens live in HttpOnly cookies (Epic 3 prerequisite),
 * so we need a server hop to translate cookie → Authorization header.
 *
 * Auto-refresh on 401: if Laravel rejects the bearer, we try /auth/refresh
 * once (using the refresh_token cookie), rotate cookies, and retry.
 *
 * Multipart uploads (the media upload path) are forwarded as-is — we
 * stream the request body rather than parsing it.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { SERVER_API_BASE } from '../../../../lib/server/api';
import { setSessionCookies, clearSessionCookies } from '../../../../lib/server/auth-routes';
import { COOKIES } from '../../../../lib/server/cookies';
import type { AuthTokens } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

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

  // Buffer the body once so we can retry after refresh without
  // consuming a stream twice.
  const bodyBuf: ArrayBuffer | null =
    method === 'GET' || method === 'DELETE' ? null : await req.arrayBuffer();

  const idToken = () => cookies().get(COOKIES.idToken)?.value;
  const refreshToken = () => cookies().get(COOKIES.refreshToken)?.value;

  const buildHeaders = (token: string | undefined): HeadersInit => {
    const h: Record<string, string> = {};
    // Forward content-type + accept; drop hop-by-hop headers.
    const ct = req.headers.get('content-type');
    const accept = req.headers.get('accept');
    if (ct) h['Content-Type'] = ct;
    h['Accept'] = accept || 'application/json';
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  };

  const send = (token: string | undefined) =>
    fetch(target, {
      method,
      headers: buildHeaders(token),
      body: bodyBuf,
      cache: 'no-store',
      // Don't follow redirects opaquely — pass them back to the browser.
      redirect: 'manual',
    });

  let upstream = await send(idToken());

  // Try one auto-refresh on 401.
  let rotatedTokens: AuthTokens | null = null;
  if (upstream.status === 401) {
    const rt = refreshToken();
    if (rt) {
      const refreshRes = await fetch(`${SERVER_API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refresh_token: rt }),
        cache: 'no-store',
      });
      if (refreshRes.ok) {
        rotatedTokens = (await refreshRes.json()) as AuthTokens;
        upstream = await send(rotatedTokens.id_token);
      }
    }
  }

  // Mirror upstream status + content-type to the browser.
  const respHeaders = new Headers();
  const upstreamCt = upstream.headers.get('content-type');
  if (upstreamCt) respHeaders.set('content-type', upstreamCt);
  const buf = await upstream.arrayBuffer();
  const res = new NextResponse(buf, { status: upstream.status, headers: respHeaders });

  if (rotatedTokens) {
    setSessionCookies(res, rotatedTokens);
  } else if (upstream.status === 401) {
    // Bearer is dead and no refresh worked — wipe the session.
    clearSessionCookies(res);
  }

  return res;
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
