/**
 * HubSpot tracking queue (`window._hsq`).
 *
 * The HubSpot loader arrives through GTM, and only once analytics consent is
 * granted. Until it arrives `_hsq` is a plain array that HubSpot drains on
 * load; after that HubSpot replaces the array's `push`. Its first, automatic
 * page view uses whatever `setPath` / `identify` were queued before it.
 *
 * Callers here never pass anything but a route-map path and the signed-in
 * member's own email (identify).
 */

type HsqWindow = Window & { _hsq?: unknown[] };

function hsq(): unknown[] | null {
  if (typeof window === 'undefined') return null;
  const w = window as HsqWindow;
  w._hsq = w._hsq || [];
  return w._hsq;
}

/** True once the HubSpot tracking script has taken over the queue. */
export function hubspotLoaded(): boolean {
  if (typeof window === 'undefined') return false;
  const q = (window as HsqWindow)._hsq;
  return !!q && q.push !== Array.prototype.push;
}

export function hsSetPath(path: string): void {
  hsq()?.push(['setPath', path]);
}

export function hsTrackPageView(): void {
  hsq()?.push(['trackPageView']);
}

export function hsIdentify(email: string): void {
  hsq()?.push(['identify', { email }]);
}

/** Stop tracking on this device (sets HubSpot's do-not-track cookie). */
export function hsDoNotTrack(): void {
  hsq()?.push(['doNotTrack']);
}

/** Undo a previous doNotTrack after the person grants consent again. */
export function hsResumeTracking(): void {
  hsq()?.push(['doNotTrack', { track: true }]);
}

/** HubSpot's own call to remove the cookies its tracking code created. */
export function hsRevokeCookieConsent(): void {
  hsq()?.push(['revokeCookieConsent']);
}

const HUBSPOT_COOKIES = ['hubspotutk', '__hstc', '__hssc', '__hssrc'];

/**
 * Remove the HubSpot visitor cookies so the next person on this device starts
 * anonymous. HubSpot sets them on the registrable domain (`.kinloom.com`),
 * so clear every parent domain as well as the host-only form.
 */
export function clearHubSpotCookies(): void {
  if (typeof document === 'undefined') return;
  const host = location.hostname;
  const parts = host.split('.');
  const domains: (string | null)[] = [null];
  for (let i = 0; i < parts.length - 1; i++) domains.push(`.${parts.slice(i).join('.')}`);
  for (const name of HUBSPOT_COOKIES) {
    for (const domain of domains) {
      document.cookie =
        `${name}=; Max-Age=0; Path=/; SameSite=Lax${domain ? `; Domain=${domain}` : ''}`;
    }
  }
}
