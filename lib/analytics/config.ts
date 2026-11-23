/**
 * Analytics switches, in one place.
 *
 * CONSENT_MODE
 *   'opt-in'  (default) Nothing analytics-related runs until the person
 *             accepts. The banner asks first.
 *   'opt-out' Analytics runs unless the person declines. The banner is a
 *             notice with the same two buttons. Only switch this if Dan
 *             approves notice/opt-out for Kinloom's audience.
 *
 * CONSENT_VERSION
 *   Bump to re-ask everyone (e.g. when the categories or vendors change).
 *   A stored choice with a different version counts as "not asked".
 */

export type ConsentMode = 'opt-in' | 'opt-out';

export const CONSENT_MODE: ConsentMode = 'opt-in';

export const CONSENT_VERSION = 1;

/** First-party cookie that holds the choice. Necessary; never sent anywhere. */
export const CONSENT_COOKIE = 'kl_consent';

/** Kept 12 months, then the banner asks again. */
export const CONSENT_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;
