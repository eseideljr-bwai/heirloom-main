'use client';

/**
 * Analytics root: one client component in the persistent root layout.
 *
 *   - Scrubs tokens from the address bar (lib/analytics/url-scrub.ts).
 *   - Keeps document.title generic (route map), as a backstop to the root
 *     layout's generateMetadata.
 *   - Pushes sanitized route values to the data layer for the GA4 tag.
 *   - Drives HubSpot: setPath before the loader's automatic first view, then
 *     setPath + trackPageView on each later committed path change; identify
 *     with the signed-in member's own email; clears the visitor on sign-out.
 *   - Shows the cookie banner.
 *
 * Inside the iOS app's embedded browser (D9) it does nothing at all.
 *
 * Module-level state (not refs) so React Strict Mode's double effects and
 * re-mounts can't double-send.
 */

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../../lib/auth-context';
import { useEmbedded } from '../../../lib/embed-context';
import {
  analyticsAllowed,
  getConsentChoice,
  getServerConsentChoice,
  subscribeConsent,
  type ConsentChoice,
} from '../../../lib/analytics/consent';
import {
  denyAnalytics,
  grantAnalytics,
  installPageValuesGlobal,
  pushRoute,
  setTrackGate,
} from '../../../lib/analytics/datalayer';
import {
  clearHubSpotCookies,
  hsDoNotTrack,
  hsIdentify,
  hsResumeTracking,
  hsRevokeCookieConsent,
  hsSetPath,
  hsTrackPageView,
  hubspotLoaded,
} from '../../../lib/analytics/hubspot';
import { featureForPath, titleForFeature } from '../../../lib/analytics/route-map';
import { scrubCurrentUrl } from '../../../lib/analytics/url-scrub';
import { CookieBanner } from './CookieBanner';

/** Settle time before a path counts as a page view (client-side redirects). */
const VIEW_SETTLE_MS = 300;
const IDENTIFIED_KEY = 'kl_hs_identified';

// ─── Module state ───────────────────────────────────────────────────
let lastHsPath: string | null = null;
let lastRoutePath: string | null = null;
let hsActive = false;
let reloadPending = false;
let identifiedInMemory: string | null = null;

function identifiedId(): string | null {
  try { return sessionStorage.getItem(IDENTIFIED_KEY); } catch { return identifiedInMemory; }
}
function setIdentifiedId(id: string | null): void {
  identifiedInMemory = id;
  try {
    if (id) sessionStorage.setItem(IDENTIFIED_KEY, id);
    else sessionStorage.removeItem(IDENTIFIED_KEY);
  } catch { /* storage disabled: memory only */ }
}

type Member = { id: string; email: string } | null;

/** identify only for the signed-in member, once per session or account change. */
function maybeIdentify(member: Member): void {
  if (!member || !member.email) return;
  if (identifiedId() === member.id) return;
  hsIdentify(member.email);
  setIdentifiedId(member.id);
}

export function AnalyticsRoot() {
  const embedded = useEmbedded();
  if (embedded) return null;
  return <AnalyticsRootInner />;
}

function AnalyticsRootInner() {
  const pathname = usePathname() || '/';
  const { user } = useAuth();
  const choice: ConsentChoice = useSyncExternalStore(subscribeConsent, getConsentChoice, getServerConsentChoice);
  const allowed = analyticsAllowed(choice);

  const member: Member = user?.email ? { id: user.id, email: user.email } : null;
  const memberRef = useRef<Member>(member);
  memberRef.current = member;
  const allowedRef = useRef(allowed);
  allowedRef.current = allowed;

  useEffect(() => {
    setTrackGate(() => allowedRef.current && !reloadPending);
    installPageValuesGlobal();
  }, []);

  // ─── Address bar + title + data layer: every committed path ───────
  useEffect(() => {
    // After the app router's own mount effect, which patches replaceState.
    const t = window.setTimeout(scrubCurrentUrl, 0);
    const feature = featureForPath(pathname);
    const title = titleForFeature(feature);
    if (document.title !== title) document.title = title;
    if (lastRoutePath !== feature.path) {
      lastRoutePath = feature.path;
      pushRoute(pathname);
    }
    return () => window.clearTimeout(t);
  }, [pathname]);

  // ─── Consent transitions ──────────────────────────────────────────
  const prevChoice = useRef<ConsentChoice | null>(null);
  useEffect(() => {
    const before = prevChoice.current;
    prevChoice.current = choice;
    if (allowed && !hsActive) {
      hsActive = true;
      // Granted from the stored cookie at page load: the bootstrap already
      // queued setPath and loaded GTM, and HubSpot's automatic first view
      // covers this page. Sending one here could double it.
      const grantedAtLoad = !!(window as Window & { __klConsentGranted?: boolean }).__klConsentGranted;
      if (before === 'denied') hsResumeTracking();
      maybeIdentify(memberRef.current);
      const path = featureForPath(window.location.pathname).path;
      hsSetPath(path);
      // A loader already on the page (consent re-granted without a reload)
      // won't make its own first view, so send one.
      if (!grantedAtLoad && hubspotLoaded() && lastHsPath !== path) hsTrackPageView();
      lastHsPath = path;
      // Consent Mode update, load GTM, then `kl_consent_granted` (fires the
      // HubSpot tag). A no-op when the bootstrap already did it on load.
      grantAnalytics();
    } else if (!allowed && hsActive) {
      hsActive = false;
      lastHsPath = null;
      setIdentifiedId(null);
      if (hubspotLoaded()) {
        hsDoNotTrack();
        hsRevokeCookieConsent();
      } else {
        // Nothing consumed the queue yet: drop whatever was waiting in it.
        (window as Window & { _hsq?: unknown[] })._hsq = [];
      }
      clearHubSpotCookies();
      // Loaded tags can't be unloaded. Reload: with the cookie now saying
      // "declined", the bootstrap leaves GTM out entirely.
      if (denyAnalytics()) window.location.reload();
    } else if (!allowed && before !== null && before !== choice) {
      // unset → denied without ever granting: tell Consent Mode explicitly.
      denyAnalytics();
    }
  }, [allowed, choice]);

  // ─── Page views on later path changes ─────────────────────────────
  useEffect(() => {
    if (!allowed || reloadPending) return;
    const t = window.setTimeout(() => {
      if (!hsActive || reloadPending) return;
      const path = featureForPath(window.location.pathname).path;
      if (path === lastHsPath) return; // query-only change, re-render, same feature
      maybeIdentify(memberRef.current);
      hsSetPath(path);
      // Before the loader arrives its automatic first view will use the
      // latest setPath; queuing a trackPageView too would double-count.
      if (hubspotLoaded()) hsTrackPageView();
      lastHsPath = path;
    }, VIEW_SETTLE_MS);
    return () => window.clearTimeout(t);
  }, [pathname, allowed]);

  // ─── Sign-out / account switch ───────────────────────────────────
  const prevMemberId = useRef<string | null | undefined>(undefined);
  const forgetVisitor = useCallback(() => {
    clearHubSpotCookies();
    setIdentifiedId(null);
    lastHsPath = null;
    // The loaded tracking script still holds the old visitor id in memory and
    // would write it back. Only a fresh page load starts a new visitor, so
    // reload once the post-sign-out navigation has landed.
    if (hubspotLoaded()) reloadPending = true;
  }, []);

  useEffect(() => {
    const id = member?.id ?? null;
    const before = prevMemberId.current;
    prevMemberId.current = id;
    if (before === undefined) return; // first render
    if (before !== null && before !== id) forgetVisitor();
    // null → member is a sign-in: identify happens with the next page view.
  }, [member?.id, forgetVisitor]);

  useEffect(() => {
    if (!reloadPending) return;
    // Give the sign-out navigation time to commit, then start fresh there.
    const t = window.setTimeout(() => window.location.reload(), 800);
    return () => window.clearTimeout(t);
  }, [pathname, member?.id]);

  return <CookieBanner />;
}
