import type { Metadata } from 'next';
import { Inter, Crimson_Pro } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../lib/auth-context';
import { ActiveFamilySpaceProvider } from '../lib/active-family-space';

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${crimsonPro.variable}`}>
      <body>
        <AuthProvider>
          <ActiveFamilySpaceProvider>{children}</ActiveFamilySpaceProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
