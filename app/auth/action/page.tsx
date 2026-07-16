'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  applyEmailVerification,
  completePasswordReset,
  verifyResetCode,
} from '../../../lib/auth';
import { useAuth } from '../../../lib/auth-context';
import { ApiError } from '../../../lib/api';

type Params = { mode: string | null; oobCode: string | null; next: string | null };

function safeNext(value: string | null): string {
  if (!value) return '/home';
  if (!value.startsWith('/') || value.startsWith('//')) return '/home';
  return value;
}

/** See app/page.tsx for why we read window.location instead of useSearchParams. */
function useActionParams(): Params | null {
  const [params, setParams] = useState<Params | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search);
    setParams({
      mode: q.get('mode'),
      oobCode: q.get('oobCode'),
      next: q.get('next'),
    });
  }, []);
  return params;
}

export default function AuthActionPage() {
  const params = useActionParams();

  if (!params) {
    return (
      <div className="auth-page">
        <div className="auth-page__inner">
          <div className="auth-card">
            <p className="auth-note">Loading…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!params.oobCode) {
    return <ActionError message="This link is missing its security code. Request a new email and try again." />;
  }

  if (params.mode === 'resetPassword') {
    return <ResetPassword oobCode={params.oobCode} />;
  }
  if (params.mode === 'verifyEmail') {
    return <VerifyEmail oobCode={params.oobCode} next={safeNext(params.next)} />;
  }

  return <ActionError message="This link isn't supported. Request a new email and try again." />;
}

// ─── Shared error shell ──────────────────────────────────────────────

function ActionError({ message, resetLink }: { message: string; resetLink?: boolean }) {
  return (
    <div className="auth-page">
      <div className="auth-page__inner">
        <div className="auth-page__head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-kinloom.png" alt="Kinloom" className="auth-page__logo" />
          <h1 className="auth-page__title">Link expired</h1>
        </div>
        <div className="auth-card">
          <div className="auth-form">
            <p className="auth-status auth-status--error">{message}</p>
            {resetLink ? (
              <Link href="/forgot-password" className="btn-primary btn-block">Request a new link</Link>
            ) : (
              <Link href="/" className="btn-primary btn-block">Back to sign in</Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Reset password ──────────────────────────────────────────────────

function ResetPassword({ oobCode }: { oobCode: string }) {
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    verifyResetCode(oobCode)
      .then(addr => { if (active) setEmail(addr); })
      .catch(() => { if (active) setInvalid(true); })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [oobCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await completePasswordReset(oobCode, password);
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 400 || err.status === 401)) {
        setInvalid(true);
      } else {
        setError(err instanceof ApiError ? err.message : 'Could not reset your password. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="auth-page">
        <div className="auth-page__inner">
          <div className="auth-card"><p className="auth-note">Checking your link…</p></div>
        </div>
      </div>
    );
  }

  if (invalid) {
    return (
      <ActionError
        message="This password reset link is invalid or has expired. Request a fresh one to continue."
        resetLink
      />
    );
  }

  if (done) {
    return (
      <div className="auth-page">
        <div className="auth-page__inner">
          <div className="auth-page__head">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-kinloom.png" alt="Kinloom" className="auth-page__logo" />
            <h1 className="auth-page__title">Password updated</h1>
          </div>
          <div className="auth-card">
            <div className="auth-form">
              <p className="auth-status auth-status--ok">
                Your password has been reset. You can now sign in with your new password.
              </p>
              <Link href="/" className="btn-primary btn-block">Sign in</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-page__inner">
        <div className="auth-page__head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-kinloom.png" alt="Kinloom" className="auth-page__logo" />
          <h1 className="auth-page__title">Choose a new password</h1>
          {email && <p className="auth-page__sub">for {email}</p>}
        </div>
        <div className="auth-card">
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="field">
              <label htmlFor="rp-pw">New password</label>
              <input
                id="rp-pw"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Minimum 8 characters"
              />
            </div>
            <div className="field">
              <label htmlFor="rp-confirm">Confirm password</label>
              <input
                id="rp-confirm"
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Re-enter password"
              />
            </div>

            {error && <p className="auth-status auth-status--error">{error}</p>}

            <button type="submit" disabled={submitting} className="btn-primary btn-block">
              {submitting ? 'Saving…' : 'Reset password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Verify email ────────────────────────────────────────────────────

function VerifyEmail({ oobCode, next }: { oobCode: string; next: string }) {
  const router = useRouter();
  const { refresh } = useAuth();
  const [state, setState] = useState<'working' | 'signed-in' | 'needs-signin' | 'error'>('working');

  useEffect(() => {
    let active = true;
    applyEmailVerification(oobCode)
      .then(async signedIn => {
        if (!active) return;
        if (signedIn) {
          await refresh();
          setState('signed-in');
          router.replace(next);
        } else {
          setState('needs-signin');
        }
      })
      .catch(() => { if (active) setState('error'); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oobCode]);

  if (state === 'error') {
    return (
      <ActionError message="This verification link is invalid or has expired. Sign in and we'll send you a fresh one." />
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-page__inner">
        <div className="auth-page__head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-kinloom.png" alt="Kinloom" className="auth-page__logo" />
          <h1 className="auth-page__title">
            {state === 'working' ? 'Verifying your email…' : 'Email verified'}
          </h1>
        </div>
        <div className="auth-card">
          <div className="auth-form">
            {state === 'working' && <p className="auth-note">Just a moment while we confirm your email.</p>}
            {state === 'signed-in' && (
              <p className="auth-status auth-status--ok">
                Your email is verified. Taking you to Kinloom…
              </p>
            )}
            {state === 'needs-signin' && (
              <>
                <p className="auth-status auth-status--ok">
                  Your email is verified. Sign in to continue.
                </p>
                <Link href="/" className="btn-primary btn-block">Sign in</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
