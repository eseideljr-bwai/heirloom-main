import type { Metadata, Viewport } from 'next';
import './fonts.css';
import './globals.css';
import { AuthProvider } from '../lib/auth-context';
import { ActiveFamilySpaceProvider } from '../lib/active-family-space';
import { EmbedProvider } from '../lib/embed-context';
import { getInitialAuthState } from '../lib/server/auth';
import { isEmbeddedRequest } from '../lib/server/embed';
import { GoogleTagManager } from './components/GoogleTagManager';
import { AnalyticsRoot } from './components/analytics/AnalyticsRoot';
import { UsageSyncRoot } from './components/analytics/UsageSyncRoot';
import { headers } from 'next/headers';
import { titleForPath } from '../lib/analytics/route-map';

// We read cookies during render to hydrate auth state — the root
// layout must be dynamic.
export const dynamic = 'force-dynamic';

/**
 * Every title comes from the analytics route map, so no page title ever
 * carries user content (kinloom titles, names, Home or Space names) into the
 * browser tab, history, or analytics. Pages must not set their own title.
 * Middleware sets `x-kinloom-path` on every request, RSC navigations included,
 * so this also runs on client-side navigation.
 */
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: titleForPath(headers().get('x-kinloom-path')),
    description: 'A private family platform that helps you create, preserve, and stay connected through what matters most.',
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
};

/**
 * Server component. Resolves the current user (account, Home, Spaces) and the active Family Space from
 * cookies during render so providers boot with the right state — no
 * client-side /me round-trip needed on first paint (Epic 3).
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { user, activeFamilySpaceId } = await getInitialAuthState();
  const embedded = isEmbeddedRequest();

  return (
    <html lang="en">
      <head>
        <link rel="preload" href="/fonts/inter-latin.e4af272c.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fonts/crimson-pro-latin.3296bccd.woff2" as="font" type="font/woff2" crossOrigin="" />
        <GoogleTagManager />
      </head>
      <body>
        <EmbedProvider embedded={embedded}>
          <AuthProvider initialUser={user}>
            <ActiveFamilySpaceProvider initialActiveFamilySpaceId={activeFamilySpaceId}>
              {children}
            </ActiveFamilySpaceProvider>
            <AnalyticsRoot />
            <UsageSyncRoot />
          </AuthProvider>
        </EmbedProvider>
      </body>
    </html>
  );
}
