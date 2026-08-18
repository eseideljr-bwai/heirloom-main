import { NextResponse, type NextRequest } from 'next/server';

/**
 * Edge middleware — does two things:
 *
 *   1. Route protection (Epic 2).
 *      Presence-checks the `kinloom_session` cookie. Protected routes
 *      redirect to `/` when it's missing; auth-entry routes redirect
 *      to `/home` when it's present. Actual signature verification
 *      happens in the `(app)` and `onboarding` server layouts —
 *      middleware runs hot enough that a remote verify per request
 *      would be wasteful, and the Admin SDK can't run on the edge.
 *      This is a cheap filter, not the authentication boundary.
 *
 *   2. Strict CSP with a per-request nonce (Epic 1).
 *      Replaces the old `'unsafe-inline'` script-src policy with a
 *      nonce so inline bootstrap scripts are still allowed but
 *      arbitrary injected ones are blocked. Next.js detects the
 *      nonce on the response and applies it to its own inline
 *      scripts automatically.
 */

const SESSION_COOKIE = 'kinloom_session';

const PROTECTED_PREFIXES = [
  '/home',
  '/create',
  '/library',
  '/family',
  '/legacy-bank',
  '/settings',
  '/help',
  '/onboarding',
  // Needs a session but NOT a verified email (that's the whole point of
  // this screen). The verified-email gate lives in the (app)/onboarding
  // server layouts, which deliberately don't cover this route.
  '/verify-email',
];

const AUTH_ENTRY_PATHS = new Set(['/', '/login', '/signup']);

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    p => pathname === p || pathname.startsWith(`${p}/`),
  );
}

function generateNonce(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  let bin = '';
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  // Base64-url without padding — CSP-safe.
  return btoa(bin).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function buildCsp(nonce: string, isDev: boolean): string {
  return [
    `default-src 'self'`,
    // 'strict-dynamic' lets a script loaded with the nonce trust its
    // dynamically-imported children, which Next.js relies on. In dev
    // we keep 'unsafe-eval' for React Refresh / HMR.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    // Allow inline styles — React emits `style="..."` attributes and
    // the codebase uses them widely. Moving to a nonce'd style-src
    // would require purging hundreds of inline-style call sites.
    `style-src 'self' 'unsafe-inline'`,
    // GCS-hosted media (signed download URLs returned by /media/{id}/url).
    `img-src 'self' data: blob: https://storage.googleapis.com https://*.storage.googleapis.com https://storage.cloud.google.com https://*.googleusercontent.com`,
    `media-src 'self' blob: https://storage.googleapis.com https://*.storage.googleapis.com https://storage.cloud.google.com`,
    `font-src 'self' data:`,
    // connect-src:
    //   • 'self'                              — BFF proxy + same-origin API routes
    //   • storage.googleapis.com              — defence-in-depth (uploads now go through /api/media-upload-proxy)
    //   • Firebase Identity Toolkit + secure  — Firebase Auth Web SDK
    //     token + Google APIs
    `connect-src 'self' https://storage.googleapis.com https://*.storage.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com${isDev ? ' ws: wss:' : ''}`,
    `frame-ancestors 'none'`,
    `form-action 'self'`,
    `base-uri 'self'`,
    `object-src 'none'`,
    `upgrade-insecure-requests`,
  ].join('; ');
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const hasSession = !!req.cookies.get(SESSION_COOKIE)?.value;

  // ─── Route protection ─────────────────────────────────────────
  if (!hasSession && isProtected(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = '/';
    if (pathname !== '/') {
      url.searchParams.set('next', pathname + (search || ''));
    } else {
      url.searchParams.delete('next');
    }
    return NextResponse.redirect(url);
  }
  if (hasSession && AUTH_ENTRY_PATHS.has(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = '/home';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // ─── Strict CSP with nonce ────────────────────────────────────
  const nonce = generateNonce();
  const isDev = process.env.NODE_ENV !== 'production';
  const csp = buildCsp(nonce, isDev);

  // Pass the nonce to the React tree via a request header. Next.js
  // picks `x-nonce` up automatically and threads it through to its
  // bootstrap <script> tags.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy', csp);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set('Content-Security-Policy', csp);
  return res;
}

export const config = {
  matcher: [
    // Skip Next internals and static assets.
    //
    // Deliberately no `missing: [next-router-prefetch, purpose=prefetch]`
    // clause. The Next.js CSP guide suggests one so prefetches skip nonce
    // generation, but `missing` gates the whole matcher — it switches
    // middleware off wholesale, route protection included. Sending
    // `purpose: prefetch` was enough to reach every protected path with no
    // cookie at all, and it stripped the CSP header too. Paying for a nonce
    // per prefetch is the cheaper side of that trade.
    '/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|woff|woff2|ttf|otf)).*)',
  ],
};
