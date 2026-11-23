/**
 * Analytics consent: the stored choice and a tiny store React can subscribe to.
 *
 * Categories
 *   Necessary  always on: sign-in, security, the marketing-email flag and this
 *              cookie itself. Not asked about.
 *   Analytics  GA4 + HubSpot tracking. Governed here.
 *   There is no advertising category; ad storage stays denied.
 *
 * Stored as the first-party cookie `kl_consent`:
 *   { "v": 1, "analytics": true|false, "at": "<ISO date>" }
 * kept 12 months. A different `v` counts as never asked.
 *
 * This module only records and broadcasts the choice. What each vendor does
 * with it lives in lib/analytics/vendors.ts.
 */

import {
  CONSENT_COOKIE,
  CONSENT_MAX_AGE_SECONDS,
  CONSENT_MODE,
  CONSENT_VERSION,
} from './config';

export type StoredConsent = { v: number; analytics: boolean; at: string };

/** `unset`: never asked (or asked under an older version). */
export type ConsentChoice = 'granted' | 'denied' | 'unset';

export function parseConsent(raw: string | null | undefined): StoredConsent | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(decodeURIComponent(raw)) as Partial<StoredConsent>;
    if (value && value.v === CONSENT_VERSION && typeof value.analytics === 'boolean' && typeof value.at === 'string') {
      return { v: value.v, analytics: value.analytics, at: value.at };
    }
  } catch {
    // Malformed cookie: treat as never asked.
  }
  return null;
}

export function choiceFrom(stored: StoredConsent | null): ConsentChoice {
  if (!stored) return 'unset';
  return stored.analytics ? 'granted' : 'denied';
}

/** Whether analytics may run, given the choice and the configured mode. */
export function analyticsAllowed(choice: ConsentChoice): boolean {
  if (choice === 'granted') return true;
  if (choice === 'denied') return false;
  return CONSENT_MODE === 'opt-out';
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  for (const part of document.cookie.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}

function writeCookie(value: StoredConsent): void {
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
  document.cookie =
    `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(value))}` +
    `; Max-Age=${CONSENT_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
}

// ─── Store ─────────────────────────────────────────────────────────

type Listener = () => void;
const listeners = new Set<Listener>();
let cached: ConsentChoice | null = null;
/** True while the person has reopened the banner from "Cookie settings". */
let reopened = false;

export function getConsentChoice(): ConsentChoice {
  if (cached === null) cached = choiceFrom(parseConsent(readCookie(CONSENT_COOKIE)));
  return cached;
}

/** Server snapshot: always `unset`, so SSR never renders vendor state. */
export function getServerConsentChoice(): ConsentChoice {
  return 'unset';
}

export function subscribeConsent(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(): void {
  for (const l of Array.from(listeners)) {
    try { l(); } catch { /* a listener must not break the others */ }
  }
}

export function setAnalyticsConsent(analytics: boolean): void {
  writeCookie({ v: CONSENT_VERSION, analytics, at: new Date().toISOString() });
  cached = analytics ? 'granted' : 'denied';
  reopened = false;
  emit();
}

/** "Cookie settings": show the banner again without changing the choice. */
export function reopenConsentBanner(): void {
  reopened = true;
  emit();
}

export function closeConsentBanner(): void {
  reopened = false;
  emit();
}

export function isConsentBannerReopened(): boolean {
  return reopened;
}
