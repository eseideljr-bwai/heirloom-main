'use client';

import { useState } from 'react';
import Link from 'next/link';
import { requestPasswordReset } from '../../lib/auth';
import { ApiError } from '../../lib/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await requestPasswordReset(email.trim());
      // The API responds generically whether or not the account exists,
      // so we always show the same confirmation (anti-enumeration).
      setSent(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setError('Too many requests. Please wait a moment and try again.');
      } else if (err instanceof ApiError && err.status === 422) {
        setError(err.firstFieldError() ?? 'Please enter a valid email address.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-page__inner">
        <div className="auth-page__head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-kinloom.png" alt="Kinloom" className="auth-page__logo" />
          <h1 className="auth-page__title">Reset your password</h1>
          <p className="auth-page__sub">
            Enter your email and we&apos;ll send you a link to set a new password.
          </p>
        </div>

        <div className="auth-card">
          {sent ? (
            <div className="auth-form">
              <p className="auth-status auth-status--ok">
                If an account exists for that email, a password reset link is on its way.
                Check your inbox (and spam folder).
              </p>
              <Link href="/" className="btn-primary btn-block">Back to sign in</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="field">
                <label htmlFor="fp-email">Email address</label>
                <input
                  id="fp-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@family.com"
                />
              </div>

              {error && <p className="auth-status auth-status--error">{error}</p>}

              <button type="submit" disabled={loading} className="btn-primary btn-block">
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          )}
        </div>

        <p className="auth-foot">
          Remembered it?{' '}
          <Link href="/" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
