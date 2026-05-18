import { NextResponse, type NextRequest } from 'next/server';

/**
 * Server-side route protection.
 *
 * Reads the HttpOnly `kinloom_id_token` cookie (set by /api/auth/login
 * and /api/auth/register). Protected routes redirect to `/` when it's
 * missing; auth-entry routes redirect to `/home` when it's present.
 *
 * This runs before any React renders, so unauthenticated users never
 * receive protected HTML.
 */

const SESSION_COOKIE = 'kinloom_id_token';

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
  const hasSession = !!req.cookies.get(SESSION_COOKIE)?.value;

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
