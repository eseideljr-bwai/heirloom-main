'use client';

/**
 * Root-layout helper for the HubSpot contact sync and the email-arrival flag.
 *   - Detects HubSpot email-click params on every page load (before any URL
 *     cleanup; HubSpot's params are never stripped anyway).
 *   - Daily sync: first authenticated page load of the day, once per member.
 * Independent of cookie consent (see lib/analytics/sync.ts). Renders nothing.
 */

import { useEffect } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { detectHubSpotEmailArrival } from '../../../lib/analytics/email-flag';
import { maybeDailySync, setSyncMember } from '../../../lib/analytics/sync';

export function UsageSyncRoot() {
  const { user, authReady } = useAuth();
  const memberId = user?.id ?? null;

  useEffect(() => {
    detectHubSpotEmailArrival();
  }, []);

  useEffect(() => {
    setSyncMember(memberId);
    if (memberId && authReady) maybeDailySync(memberId);
  }, [memberId, authReady]);

  return null;
}
