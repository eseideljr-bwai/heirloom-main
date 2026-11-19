'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import { acceptConsent, errorText } from '../../lib/settings';
import { ConsentCheckbox } from '../components/ConsentCheckbox';

/**
 * Splash shown to a signed-in person whose consent is false: they never
 * accepted, or the Terms or Privacy Policy version changed since they did.
 * Same checkbox as sign-up.
 */
export function ConsentCard({ next }: { next: string }) {
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { logout } = useAuth();

  const handleAgree = async () => {
    if (!agreed || busy) return;
    setBusy(true);
    setError('');
    try {
      const settings = await acceptConsent();
      if (!settings.consent.consent_given) {
        // The server didn't take it (shouldn't happen); don't loop them back.
        setError('We couldn’t record your agreement. Please try again.');
        setBusy(false);
        return;
      }
      router.replace(next);
      // Drop any cached render that still had them gated.
      router.refresh();
    } catch (err) {
      setError(errorText(err, 'We couldn’t record your agreement. Please try again.'));
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    setBusy(true);
    try {
      await logout();
    } finally {
      router.replace('/');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-page__inner consent-card">
        <div className="auth-page__head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-kinloom.png" alt="Kinloom" className="auth-page__logo" />
          <h1 className="auth-page__title">Before you continue</h1>
          <p className="auth-page__sub">
            We&apos;ve updated our Terms of Use and Trust &amp; Privacy Policy.
          </p>
        </div>

        <div className="auth-card consent-card__card">
          <div className="auth-form">
            <ConsentCheckbox checked={agreed} onChange={setAgreed} disabled={busy} />

            <button
              type="button"
              onClick={handleAgree}
              disabled={!agreed || busy}
              className="btn-primary btn-block"
            >
              {busy ? 'Saving…' : 'Agree and continue'}
            </button>

            {error && (
              <p role="alert" className="auth-status auth-status--error">
                {error}
              </p>
            )}

            <p className="consent-card__signout">
              <button
                type="button"
                onClick={handleSignOut}
                disabled={busy}
                className="auth-link auth-linkbutton"
              >
                Sign out
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
