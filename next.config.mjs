/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV !== 'production';

// ─── Content Security Policy ─────────────────────────────────────────
//
// Goals:
//   • Block third-party JS, fonts, iframes, etc.
//   • Allow inline styles (this app uses `style={...}` everywhere; React
//     emits those as `style="..."` attributes which need 'unsafe-inline'
//     in style-src).
//   • Allow Next.js's own inline bootstrap scripts. To make this strict
//     we'd need to switch to a nonce in middleware — punt for now.
//   • In dev: also allow 'unsafe-eval' (React Refresh / HMR uses eval)
//     and ws: (HMR socket).
//
// API calls live behind `/proxy/*` (same origin) so connect-src 'self'
// covers them. If you set NEXT_PUBLIC_API_URL to bypass the proxy, add
// that origin here.
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob:`,
  `font-src 'self' data:`,
  `connect-src 'self'${isDev ? ' ws: wss:' : ''}`,
  `frame-ancestors 'none'`,
  `form-action 'self'`,
  `base-uri 'self'`,
  `object-src 'none'`,
  `upgrade-insecure-requests`,
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  // Defense in depth — `frame-ancestors` in CSP already covers this,
  // but older browsers (and some embedded webviews) only honor X-F-O.
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Disable browser features we never use. Add to the allowlist only
  // when a real need shows up.
  {
    key: 'Permissions-Policy',
    value: [
      'accelerometer=()',
      'camera=()',
      'geolocation=()',
      'gyroscope=()',
      'magnetometer=()',
      'microphone=()',
      'payment=()',
      'usb=()',
    ].join(', '),
  },
  // HSTS only in prod (would lock localhost into https otherwise).
  ...(!isDev
    ? [{
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      }]
    : []),
];

const nextConfig = {
  output: 'standalone', // Critical for Cloud Run

  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },

  // Proxy backend API through Next.js so the browser sees same-origin
  // requests (avoids CORS). Override the destination with BACKEND_API_URL.
  async rewrites() {
    const backend = (
      process.env.BACKEND_API_URL ||
      'https://kinloom-api-laravel-fz0wpjzb.on-forge.com/api'
    ).replace(/\/$/, '');
    return [
      {
        source: '/proxy/:path*',
        destination: `${backend}/:path*`,
      },
    ];
  },
};

export default nextConfig;
