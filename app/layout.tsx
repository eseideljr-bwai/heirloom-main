import type { Metadata } from 'next';
import { Inter, Crimson_Pro } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../lib/auth-context';
import { ActiveFamilySpaceProvider } from '../lib/active-family-space';
import { getInitialAuthState } from '../lib/server/auth';

// We read cookies during render to hydrate auth state — the root
// layout must be dynamic.
export const dynamic = 'force-dynamic';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['300', '400', '500', '600'],
  display: 'swap',
});

const crimsonPro = Crimson_Pro({
  subsets: ['latin'],
  variable: '--font-crimson-pro',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Kinloom — Preserve Your Family Legacy',
  description: 'A private family platform that helps you create, preserve, and stay connected through what matters most.',
};

/**
 * Server component. Resolves the current user + active space from
 * cookies during render so providers boot with the right state — no
 * client-side /me round-trip needed on first paint (Epic 3).
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { user, activeSpaceId } = await getInitialAuthState();

  return (
    <html lang="en" className={`${inter.variable} ${crimsonPro.variable}`}>
      <body>
        <AuthProvider initialUser={user}>
          <ActiveFamilySpaceProvider initialActiveSpaceId={activeSpaceId}>
            {children}
          </ActiveFamilySpaceProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
