import { cookies, headers } from 'next/headers';
import { analyticsAllowed, choiceFrom, parseConsent } from '../../lib/analytics/consent';
import { CONSENT_COOKIE } from '../../lib/analytics/config';
import { featureForPath } from '../../lib/analytics/route-map';
import { isEmbeddedRequest } from '../../lib/server/embed';

/**
 * Google Tag Manager, behind Kinloom's own consent (D1).
 *
 * One nonce'd inline script, in <head>, before anything else analytics:
 *   1. Google Consent Mode v2 defaults: everything denied.
 *   2. `window.__klLoadGtm()`, which injects gtm.js once. Nothing calls it
 *      until analytics consent is granted.
 *   3. If the stored `kl_consent` cookie already grants analytics, it
 *      updates consent, loads GTM and pushes `kl_consent_granted` right
 *      away, so returning members are tracked from the first view.
 * Otherwise the banner (app/components/analytics) calls the same function
 * when the person accepts (lib/analytics/datalayer.ts `grantAnalytics`).
 *
 * Off when NEXT_PUBLIC_GTM_ID is unset (local, dev, previews) and inside
 * the iOS app's embedded browser (D9): no script at all, so nothing loads.
 *
 * CSP: middleware.ts issues a per-request nonce with 'strict-dynamic'. This
 * inline script carries the nonce; gtm.js is script-inserted, so it is
 * trusted under 'strict-dynamic'. The nonce is also set on the gtm.js tag so
 * GTM can hand it to the tags it injects (the HubSpot Custom HTML tag).
 */

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

// The ID is interpolated into an inline script, so accept only the real format.
const VALID_GTM_ID = /^GTM-[A-Z0-9]+$/;

export function GoogleTagManager() {
  if (!GTM_ID || !VALID_GTM_ID.test(GTM_ID)) return null;
  if (isEmbeddedRequest()) return null;

  // Base64url from middleware.ts — safe to interpolate into a JS string.
  const nonce = headers().get('x-nonce') ?? '';
  const granted = analyticsAllowed(choiceFrom(parseConsent(cookies().get(CONSENT_COOKIE)?.value)));
  // Route-map path (a fixed, content-free string) for HubSpot's automatic
  // first view. Queued here, before GTM can load, so that first view is
  // sanitized even if HubSpot arrives before hydration.
  const initialPath = JSON.stringify(featureForPath(headers().get('x-kinloom-path')).path);

  const script = `(function(w,d,i,n,g){
w.dataLayer=w.dataLayer||[];
function gtag(){w.dataLayer.push(arguments);}
gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
w.__klLoadGtm=function(){
if(w.__klGtmLoaded)return false;w.__klGtmLoaded=true;
w.dataLayer.push({'gtm.start':new Date().getTime(),event:'gtm.js'});
var j=d.createElement('script');j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;
if(n)j.setAttribute('nonce',n);d.head.appendChild(j);return true;};
if(g){
w._hsq=w._hsq||[];w._hsq.push(['setPath',${initialPath}]);
gtag('consent','update',{analytics_storage:'granted'});
w.__klLoadGtm();
w.dataLayer.push({event:'kl_consent_granted'});
w.__klConsentGranted=true;
}
})(window,document,'${GTM_ID}','${nonce}',${granted ? 'true' : 'false'});`;

  // A plain <script> rendered in <head> by the root layout: it runs before
  // hydration, so Consent Mode defaults are in place before anything else.
  // suppressHydrationWarning: browsers hide a script's nonce attribute from
  // the DOM after parsing, which React would otherwise report as a mismatch.
  return (
    <script
      id="gtm-bootstrap"
      nonce={nonce || undefined}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}
