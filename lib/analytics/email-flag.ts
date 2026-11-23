/**
 * "Came from a HubSpot email" flag — hides the marketing checkbox at sign-up.
 *
 * Necessary/functional, not analytics: a boolean and a date in localStorage
 * (`kl_from_hs_email` = { v: 1, at }), never an email, contact id or the
 * `_hsenc` value, and never sent to GA4 or the data layer. Valid 30 days;
 * cleared after sign-up. The server never treats it as consent on its own
 * (it checks the address is already a HubSpot marketing contact).
 *
 * HubSpot's own params are read, not removed, so its tracking code can still
 * attribute the click.
 *
 * D10 (pending): confirm against a real HubSpot email link that it lands on
 * app.kinloom.com and which of these params it carries. If the emails link
 * to kinloom.com instead, this flag is never set on the app.
 */

const KEY = 'kl_from_hs_email';
const VALID_MS = 30 * 24 * 60 * 60 * 1000;

function hasHubSpotEmailParams(params: URLSearchParams): boolean {
  return params.has('_hsenc') || params.has('_hsmi') || params.get('utm_source') === 'hs_email';
}

/** Run on every page load, before any URL cleanup. */
export function detectHubSpotEmailArrival(): void {
  if (typeof window === 'undefined') return;
  try {
    const params = new URLSearchParams(window.location.search);
    let hit = hasHubSpotEmailParams(params);
    // A signed-out click on a protected link arrives at /?next=/path?_hsenc=…
    const next = params.get('next');
    if (!hit && next && next.includes('?')) {
      hit = hasHubSpotEmailParams(new URLSearchParams(next.slice(next.indexOf('?') + 1)));
    }
    if (hit) localStorage.setItem(KEY, JSON.stringify({ v: 1, at: new Date().toISOString() }));
  } catch {
    // Storage disabled: the checkbox simply shows.
  }
}

export function cameFromMarketingEmail(): boolean {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    const v = JSON.parse(raw) as { v?: number; at?: string };
    const at = v.at ? Date.parse(v.at) : NaN;
    if (v.v !== 1 || Number.isNaN(at) || Date.now() - at > VALID_MS) {
      localStorage.removeItem(KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function clearMarketingEmailFlag(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
