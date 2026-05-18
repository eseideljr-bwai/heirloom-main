import { NextResponse, type NextRequest } from 'next/server';

/**
 * Server-side route protection for Epic 2.
 *
 * Reads the `kinloom_session` cookie (mirrored client-side from the
 * `id_token` localStorage entry). Tokens themselves stay in localStorage
 * (matches the existing Firebase-era persistence model); this cookie is
 * just a "session present" flag so we can redirect on the edge before any
 * protected HTML is shipped. Without this, unauthenticated users see the
 * protected app's HTML for a frame before the `useEffect` guard runs.
 *
 * NOTE: cookie is HttpOnly=false on purpose — the client owns it. If we
 * ever move tokens out of localStorage and into HttpOnly cookies, this
 * flag goes with them.
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
];

const AUTH_ENTRY_PATHS = new Set(['/', '/login', '/signup']);

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    p => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const hasSession = req.cookies.get(SESSION_COOKIE)?.value === '1';

  if (!hasSession && isProtected(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = '/';
    // Preserve where they were headed so we can bounce them back after login.
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

  return NextResponse.next();
}

export const config = {
  // Skip Next internals, static assets, and the media-upload proxy (which
  // is hit while authenticated but doesn't need the redirect dance).
  matcher: [
    '/((?!_next/|api/|proxy/|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|woff|woff2|ttf|otf)).*)',
  ],
};
