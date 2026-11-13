import Script from 'next/script';
import { headers } from 'next/headers';

/**
 * Google Tag Manager container loader. Rendered once from the root layout,
 * so it covers every route. GA4 and any other tags are configured inside the
 * GTM web UI, not here.
 *
 * Off unless NEXT_PUBLIC_GTM_ID is set, so local dev and environments that
 * don't set it send nothing. Next only inlines `process.env.NEXT_PUBLIC_*`
 * via literal dot-notation (see lib/feedback/config.ts), hence the const.
 *
 * CSP: middleware.ts issues a per-request nonce with 'strict-dynamic'. The
 * inline bootstrap carries that nonce, and gtm.js — created by a trusted
 * script — inherits trust under 'strict-dynamic'. The nonce is also set on
 * the gtm.js tag itself so GTM can hand it to the tags it injects.
 */

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

// The ID is interpolated into an inline script, so accept only the real format.
const VALID_GTM_ID = /^GTM-[A-Z0-9]+$/;

export function GoogleTagManager() {
  if (!GTM_ID || !VALID_GTM_ID.test(GTM_ID)) return null;

  // Base64url from middleware.ts — safe to interpolate into a JS string.
  const nonce = headers().get('x-nonce') ?? '';

  return (
    <Script id="gtm-bootstrap" strategy="afterInteractive" nonce={nonce || undefined}>
      {`(function(w,d,l,i,n){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
var j=d.createElement('script');j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;
if(n)j.setAttribute('nonce',n);d.head.appendChild(j);})(window,document,'dataLayer','${GTM_ID}','${nonce}');`}
    </Script>
  );
}
