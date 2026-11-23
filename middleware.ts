import { NextResponse, type NextRequest } from 'next/server';
import {
  EMBED_CLIENT_HEADER,
  EMBED_COOKIE,
  EMBED_IOS,
  EMBED_REQUEST_HEADER,
} from './lib/embed';
import {
  INVITE_TOKEN_COOKIE,
  INVITE_TOKEN_COOKIE_MAX_AGE_SECONDS,
  INVITE_TOKEN_COOKIE_PATH,
} from './lib/server/cookies';

/**
 * Edge middleware — does three things:
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
 *
 *   3. iOS embed mode (SOW D1). `?embed=ios` or `X-Kinloom-Client: ios`
 *      sets the `kinloom_embed` cookie, which outlives the query param
 *      across client-side navigations; `?embed=off` clears it. The
 *      result is forwarded as `x-kinloom-embed` for server components.
 *      See lib/embed.ts for the bridge contract.
 */

const SESSION_COOKIE = 'kinloom_session';
const PATH_REQUEST_HEADER = 'x-kinloom-path';

const PROTECTED_PREFIXES = [
  '/home',
  '/create',
  '/library',
  '/legacy-bank',
  '/settings',
  '/help',
  '/onboarding',
  // Needs a session but NOT a verified email (that's the whole point of
  // this screen). The verified-email gate lives in the (app)/onboarding
  // server layouts, which deliberately don't cover this route.
  '/verify-email',
  // Accepting the current Terms and Privacy Policy (see the (app) layout).
  '/consent',
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
    // HEIC photo conversion (lib/image-normalize.ts) decodes in a Web Worker
    // that heic-to starts from a blob: URL. Without worker-src, workers fall
    // back to script-src, which allows no blob: and would block the decoder.
    // Only script already running on the page can mint a blob: worker.
    `worker-src 'self' blob:`,
    `style-src 'self' 'unsafe-inline'`,
    // GCS-hosted media (signed download URLs returned by /media/{id}/url).
    // Also Google Tag Manager / GA4 beacons (pixel fallback), and the HubSpot
    // tracking pixel (hub 244135672, na2). Only the pixel: HubSpot's collected
    // forms (*.hscollectedforms.net) stay blocked on purpose — it would read
    // app forms (sign-in emails, invitee emails). Never add it.
    `img-src 'self' data: blob: https://storage.googleapis.com https://*.storage.googleapis.com https://storage.cloud.google.com https://*.googleusercontent.com https://*.google-analytics.com https://*.googletagmanager.com https://track-na2.hubspot.com`,
    `media-src 'self' blob: https://storage.googleapis.com https://*.storage.googleapis.com https://storage.cloud.google.com`,
    `font-src 'self' data:`,
    // connect-src:
    //   • 'self'                              — BFF proxy + same-origin API routes
    //   • storage.googleapis.com              — defence-in-depth (uploads now go through /api/media-upload-proxy)
    //   • Firebase Identity Toolkit + secure  — Firebase Auth Web SDK
    //     token + Google APIs
    //   • Google Tag Manager / GA4           — analytics collection
    //     (gtm.js itself needs no script-src host: under 'strict-dynamic'
    //     it is trusted via the nonced bootstrap in GoogleTagManager.tsx)
    `connect-src 'self' https://storage.googleapis.com https://*.storage.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com${isDev ? ' ws: wss:' : ''}`,
    `frame-ancestors 'none'`,
    `form-action 'self'`,
    `base-uri 'self'`,
    `object-src 'none'`,
    `upgrade-insecure-requests`,
  ].join('; ');
}

type EmbedDecision = { embedded: boolean; cookie: 'set' | 'clear' | null };

function resolveEmbed(req: NextRequest): EmbedDecision {
  const param = req.nextUrl.searchParams.get('embed');
  if (param === EMBED_IOS) return { embedded: true, cookie: 'set' };
  if (param === 'off') return { embedded: false, cookie: 'clear' };
  if (req.headers.get(EMBED_CLIENT_HEADER) === EMBED_IOS) {
    return { embedded: true, cookie: 'set' };
  }
  return { embedded: req.cookies.get(EMBED_COOKIE)?.value === EMBED_IOS, cookie: null };
}

function applyEmbedCookie(res: NextResponse, embed: EmbedDecision): NextResponse {
  if (embed.cookie === null) return res;
  // No maxAge: a session cookie, so a browser that hits ?embed=ios once
  // drops the embedded shell when it closes.
  res.cookies.set(EMBED_COOKIE, embed.cookie === 'set' ? EMBED_IOS : '', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    ...(embed.cookie === 'clear' ? { maxAge: 0 } : {}),
  });
  return res;
}

/**
 * `/invite/<token>`: keep the token in an HttpOnly cookie scoped to /invite,
 * so the page can strip it from the address bar (analytics, Referer, history)
 * and a refresh of the bare `/invite` still finds it. See
 * lib/analytics/url-scrub.ts and app/invite/page.tsx.
 */
const INVITE_TOKEN_PATH = /^\/invite\/([A-Za-z0-9_-]{1,256})\/?$/;

function applyInviteTokenCookie(res: NextResponse, pathname: string): void {
  const match = INVITE_TOKEN_PATH.exec(pathname);
  if (!match) return;
  res.cookies.set(INVITE_TOKEN_COOKIE, match[1], {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: INVITE_TOKEN_COOKIE_PATH,
    maxAge: INVITE_TOKEN_COOKIE_MAX_AGE_SECONDS,
  });
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const hasSession = !!req.cookies.get(SESSION_COOKIE)?.value;
  const embed = resolveEmbed(req);

  // ─── Route protection ─────────────────────────────────────────
  // In the iOS WebView the redirect to `/` is the signal the native
  // navigation guard treats as an expired session.
  if (!hasSession && isProtected(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = '/';
    if (pathname !== '/') {
      url.searchParams.set('next', pathname + (search || ''));
    } else {
      url.searchParams.delete('next');
    }
    return applyEmbedCookie(NextResponse.redirect(url), embed);
  }
  // `/?reason=session_expired` is where the (app) layouts send someone whose
  // session cookie failed verification (deleted account, revoked, expired).
  // This check only sees that a cookie exists, so bouncing that URL on to
  // `/home` sent them straight back: an endless redirect, with no page ever
  // loading to clear the dead cookie. Let it render; the login page signs the
  // stale session out, and a person who is in fact signed in is moved on by
  // its own effect.
  const sessionExpired = req.nextUrl.searchParams.get('reason') === 'session_expired';
  if (hasSession && AUTH_ENTRY_PATHS.has(pathname) && !sessionExpired) {
    const url = req.nextUrl.clone();
    url.pathname = '/home';
    url.search = '';
    return applyEmbedCookie(NextResponse.redirect(url), embed);
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
  // Always overwritten, so a client can't smuggle in its own value.
  // The path being rendered, for server layouts that redirect and need to
  // send the person back afterwards (the consent gate). Always overwritten.
  requestHeaders.set(PATH_REQUEST_HEADER, pathname + (search || ''));
  if (embed.embedded) requestHeaders.set(EMBED_REQUEST_HEADER, EMBED_IOS);
  else requestHeaders.delete(EMBED_REQUEST_HEADER);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set('Content-Security-Policy', csp);
  applyInviteTokenCookie(res, pathname);
  return applyEmbedCookie(res, embed);
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
