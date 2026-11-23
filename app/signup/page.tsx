'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';
import { ApiError } from '../../lib/api';
import { ConsentCheckbox } from '../components/ConsentCheckbox';
import { acceptConsent } from '../../lib/settings';
import { PASSWORD_MIN_LENGTH } from '../../lib/password-policy';
import { PasswordStrength, usePasswordPolicy } from '../components/PasswordStrength';
import { PasswordInput } from '../components/PasswordInput';
import { MarketingOptInCheckbox } from '../components/MarketingOptInCheckbox';
import { cameFromMarketingEmail, clearMarketingEmailFlag } from '../../lib/analytics/email-flag';
import { requestSignupSync } from '../../lib/analytics/sync';

function safeNext(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  return value;
}

/** See app/page.tsx for why we read window.location instead of useSearchParams. */
function useNextParam(): string | null {
  const [next, setNext] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    setNext(safeNext(params.get('next')));
  }, []);
  return next;
}

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Never pre-checked. Sent to the API once the account exists.
  const [agreed, setAgreed] = useState(false);
  // Marketing emails: optional, never pre-checked, never blocks sign-up.
  // Held only in the browser until the account exists, then sent once.
  const [marketing, setMarketing] = useState(false);
  // Arrived from a HubSpot email: already on the list, so don't ask again.
  // Read after mount (localStorage) so server and client first renders match.
  const [fromEmail, setFromEmail] = useState<boolean | null>(null);
  useEffect(() => { setFromEmail(cameFromMarketingEmail()); }, []);
  // Holds the redirect below until the consent PATCH has settled, so
  // navigating away can't tear the request down.
  const [savingConsent, setSavingConsent] = useState(false);
  const router = useRouter();
  const next = useNextParam();
  const { user, loading: authLoading, register } = useAuth();
  const passwordCheck = usePasswordPolicy(password, [name, email]);

  useEffect(() => {
    if (!authLoading && user && !savingConsent) {
      // New accounts must verify their email before entering the app.
      // Carry any `next` (e.g. an invite link) through the pending screen.
      const dest = next
        ? `/verify-email?next=${encodeURIComponent(next)}`
        : '/verify-email';
      router.replace(dest);
    }
  }, [authLoading, user, router, next, savingConsent]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // The button is disabled until the box is checked; this backs that up so
    // consent can never be recorded without it.
    if (!agreed) return;

    if (passwordCheck.problem) {
      setError(passwordCheck.problem);
      return;
    }
    if (password !== passwordConfirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setSavingConsent(true);
    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        password_confirmation: passwordConfirm,
      });
      // The account exists: record the marketing choice in HubSpot
      // (fire-and-forget; the server verifies the email through GET /me).
      requestSignupSync(fromEmail ? { fromMarketingEmail: true } : { marketingOptIn: marketing });
      clearMarketingEmailFlag();
      // The box had to be checked to submit. Record it now that the account
      // exists. A failure doesn't undo the sign-up: consent stays false and
      // the (app) layout sends them to /consent before they reach the app.
      try {
        await acceptConsent();
      } catch (consentErr) {
        console.warn('[signup] could not record consent', consentErr);
      }
      setSavingConsent(false);
      // The /verify-email screen owns sending the verification email on
      // mount (see its auto-send effect). Doing it here raced the
      // redirect below and the fetch could be torn down before it fired.
      // Effect above redirects to /verify-email once `user` populates.
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setError('An account with this email already exists. Try signing in instead.');
        } else if (err.status === 422) {
          setError(err.firstFieldError() ?? 'Please check the form and try again.');
        } else {
          setError(err.message);
        }
      } else {
        setError(err instanceof Error ? err.message : 'Signup failed.');
      }
      setSavingConsent(false);
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fdfcfa', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>

        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-kinloom.png" alt="Kinloom" style={{ height: 80, width: 'auto', margin: '0 auto 24px' }} />
          <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 32, lineHeight: 1.2, margin: '0 0 8px', color: '#1a1a1a' }}>Create your account</h1>
          <p style={{ fontSize: 15, color: 'rgba(26,26,26,0.7)', margin: 0 }}>Begin preserving your family&apos;s legacy</p>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #d4d2cc', borderRadius: 16, padding: 32, boxShadow: '0 10px 30px -8px rgba(0,0,0,0.05)' }}>
          <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="auth-label">Your name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                maxLength={255}
                autoComplete="name"
                placeholder="Jane Doe"
                className="auth-input"
              />
            </div>
            <div>
              <label className="auth-label">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@family.com"
                className="auth-input"
              />
            </div>
            <div>
              <label className="auth-label">Password</label>
              <PasswordInput
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={PASSWORD_MIN_LENGTH}
                autoComplete="new-password"
                placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
                className="auth-input"
                aria-describedby="signup-pw-rules"
              />
              <PasswordStrength id="signup-pw-rules" password={password} check={passwordCheck} />
            </div>
            <div>
              <label className="auth-label">Confirm password</label>
              <PasswordInput
                value={passwordConfirm}
                onChange={e => setPasswordConfirm(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="Re-enter password"
                className="auth-input"
              />
            </div>

            {error && (
              <p style={{ fontSize: 14, color: '#d4183d', margin: 0 }}>{error}</p>
            )}

            <ConsentCheckbox checked={agreed} onChange={setAgreed} />
            {fromEmail === false && <MarketingOptInCheckbox checked={marketing} onChange={setMarketing} />}

            <button
              type="submit"
              disabled={loading || !agreed || !passwordCheck.ok}
              style={{ width: '100%', background: '#556b5b', color: '#fdfcfa', border: 'none', padding: '14px', borderRadius: 8, fontSize: 15, fontWeight: 500, fontFamily: 'inherit', cursor: loading || !agreed || !passwordCheck.ok ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : (!agreed || !passwordCheck.ok) ? 0.5 : 1, marginTop: 8 }}
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>

            <p style={{ fontSize: 13, color: '#6b6b6b', textAlign: 'center', margin: 0 }}>
              Private by design. We won&apos;t share your email.
            </p>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 14, color: 'rgba(26,26,26,0.7)', margin: '24px 0 0' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#556b5b', textDecoration: 'none', fontWeight: 500 }}>Sign in</Link>
        </p>

      </div>
    </div>
  );
}
