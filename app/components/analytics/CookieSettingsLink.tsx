'use client';

import { reopenConsentBanner } from '../../../lib/analytics/consent';
import { useEmbedded } from '../../../lib/embed-context';

/** Reopens the cookie banner. Hidden in the iOS app, which has no banner (D9). */
export function CookieSettingsLink({ className }: { className?: string }) {
  const embedded = useEmbedded();
  if (embedded) return null;
  return (
    <button type="button" className={className ?? 'kl-cookie-settings'} onClick={reopenConsentBanner}>
      Cookie settings
    </button>
  );
}
