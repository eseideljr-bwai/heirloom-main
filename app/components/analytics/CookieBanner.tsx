'use client';

/**
 * Kinloom's own cookie banner (D1, option b). HubSpot's banner must stay
 * disabled for app.kinloom.com so only this one ever shows.
 *
 * Shown when no current choice is stored, or when reopened from
 * "Cookie settings". Accept and Decline carry equal weight.
 *
 * Copy approved by Dan (Nov 2026). Don't reword without his sign-off.
 */

import { useEffect, useRef, useSyncExternalStore } from 'react';
import {
  closeConsentBanner,
  getConsentChoice,
  getServerConsentChoice,
  isConsentBannerReopened,
  setAnalyticsConsent,
  subscribeConsent,
} from '../../../lib/analytics/consent';

const PRIVACY_POLICY_URL = 'https://kinloom.com/privacy-policy';

const getReopened = () => isConsentBannerReopened();
const getServerReopened = () => false;

export function CookieBanner() {
  const choice = useSyncExternalStore(subscribeConsent, getConsentChoice, getServerConsentChoice);
  const reopened = useSyncExternalStore(subscribeConsent, getReopened, getServerReopened);
  // Server snapshot is `unset`; wait for the client before deciding, so a
  // person who already chose never sees the banner flash.
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const open = mounted && (choice === 'unset' || reopened);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (open && reopened) headingRef.current?.focus();
  }, [open, reopened]);

  if (!open) return null;

  return (
    <section className="kl-cookie" role="region" aria-labelledby="kl-cookie-title">
      <div className="kl-cookie__card">
        <h2 id="kl-cookie-title" className="kl-cookie__title" ref={headingRef} tabIndex={-1}>
          Cookies on Kinloom
        </h2>
        <p className="kl-cookie__text">
          We use necessary cookies to keep you signed in and your account secure.
          With your permission, we&rsquo;d also use analytics cookies from Google Analytics and
          HubSpot to see which parts of Kinloom get used, so we can make them better.
          They never see your stories, your family&rsquo;s names or anything you write.
        </p>
        <p className="kl-cookie__text kl-cookie__text--small">
          You can change your mind any time from Cookie settings.{' '}
          <a href={PRIVACY_POLICY_URL} target="_blank" rel="noopener noreferrer" className="kl-cookie__link">
            Privacy Policy
          </a>
        </p>
        <div className="kl-cookie__actions">
          <button type="button" className="kl-cookie__btn" onClick={() => setAnalyticsConsent(false)}>
            Decline
          </button>
          <button type="button" className="kl-cookie__btn" onClick={() => setAnalyticsConsent(true)}>
            Accept
          </button>
        </div>
        {reopened && choice !== 'unset' && (
          <button type="button" className="kl-cookie__close" onClick={closeConsentBanner}>
            Keep my current choice ({choice === 'granted' ? 'accepted' : 'declined'})
          </button>
        )}
      </div>
    </section>
  );
}

function noopSubscribe(): () => void {
  return () => {};
}
