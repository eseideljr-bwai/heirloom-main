/**
 * The only code that writes to `window.dataLayer` for analytics.
 *
 * What may go in:
 *   - `kl_route`: sanitized `kl_page_path` / `kl_page_title` from the route map.
 *   - Consent Mode updates and the `kl_consent_granted` / `kl_consent_revoked`
 *     events.
 *   - `track()` events, from a fixed allowlist, with no parameters.
 * Never: names, emails, ids, tokens, query strings, content.
 */

import { featureForPath, titleForFeature } from './route-map';

type DataLayerWindow = Window & { dataLayer?: unknown[] };

function dataLayer(): unknown[] | null {
  if (typeof window === 'undefined') return null;
  const w = window as DataLayerWindow;
  w.dataLayer = w.dataLayer || [];
  return w.dataLayer;
}

/** Same shape as gtag(): Consent Mode commands must be pushed as an Arguments object. */
function gtag(..._args: unknown[]): void {
  // eslint-disable-next-line prefer-rest-params
  dataLayer()?.push(arguments);
}

type LoaderWindow = Window & {
  /** Defined by the inline bootstrap (app/components/GoogleTagManager.tsx). */
  __klLoadGtm?: () => boolean;
  __klGtmLoaded?: boolean;
  __klConsentGranted?: boolean;
};

/**
 * Analytics consent granted: Consent Mode update, then load GTM (once), then
 * `kl_consent_granted` — the trigger for the HubSpot tag. In that order, so
 * GTM initialises with consent already granted. A no-op if the bootstrap
 * already did all of this for a stored grant.
 */
export function grantAnalytics(): void {
  if (typeof window === 'undefined') return;
  const w = window as LoaderWindow;
  if (w.__klConsentGranted) return;
  w.__klConsentGranted = true;
  gtag('consent', 'update', { analytics_storage: 'granted' });
  w.__klLoadGtm?.();
  dataLayer()?.push({ event: 'kl_consent_granted' });
}

/**
 * Analytics consent declined or revoked. Returns true when GTM had already
 * loaded on this page: its tags can't be unloaded, so the caller reloads and
 * the bootstrap then leaves GTM out entirely.
 */
export function denyAnalytics(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as LoaderWindow;
  // Ad signals were never granted; analytics goes back to denied.
  gtag('consent', 'update', { analytics_storage: 'denied' });
  dataLayer()?.push({ event: 'kl_consent_revoked' });
  const wasLoaded = !!w.__klGtmLoaded;
  w.__klConsentGranted = false;
  return wasLoaded;
}

/** Sanitized page values for the GA4 Google tag (page_location / page_title). */
export function sanitizedPageValues(pathname: string): { kl_page_path: string; kl_page_title: string; kl_page_location: string } {
  const feature = featureForPath(pathname);
  const origin = typeof location !== 'undefined' ? location.origin : '';
  return {
    kl_page_path: feature.path,
    kl_page_title: titleForFeature(feature),
    kl_page_location: `${origin}${feature.path}`,
  };
}

/**
 * `window.klAnalytics`: sanitized values read from the *current* location at
 * call time. GA4's history-based page_view fires synchronously inside Next's
 * pushState, before any React effect can push `kl_route`, so a data-layer
 * variable would hold the previous page there. The Google tag's
 * page_location / page_title should use GTM Custom JavaScript variables:
 *   function () { return window.klAnalytics && window.klAnalytics.pageLocation(); }
 *   function () { return window.klAnalytics && window.klAnalytics.pageTitle(); }
 */
export function installPageValuesGlobal(): void {
  if (typeof window === 'undefined') return;
  const read = () => sanitizedPageValues(window.location.pathname);
  (window as Window & { klAnalytics?: unknown }).klAnalytics = Object.freeze({
    pagePath: () => read().kl_page_path,
    pageTitle: () => read().kl_page_title,
    pageLocation: () => read().kl_page_location,
  });
}

export function pushRoute(pathname: string): void {
  dataLayer()?.push({ event: 'kl_route', ...sanitizedPageValues(pathname) });
}

// ─── track() ───────────────────────────────────────────────────────

const ALLOWED_EVENTS = ['sign_up', 'first_kinloom_created'] as const;
export type TrackEvent = (typeof ALLOWED_EVENTS)[number];

let allowed: () => boolean = () => false;

/** Wired by AnalyticsRoot so track() follows consent and the iOS embed rule. */
export function setTrackGate(gate: () => boolean): void {
  allowed = gate;
}

/** Whether track() would send right now (consent granted, not embedded). */
export function trackAllowed(): boolean {
  return allowed();
}

/**
 * Push one allowlisted event with no parameters. Call only after the API has
 * confirmed success. Silently does nothing without analytics consent.
 */
export function track(event: TrackEvent): void {
  if (!(ALLOWED_EVENTS as readonly string[]).includes(event)) return;
  if (!allowed()) return;
  dataLayer()?.push({ event });
}
