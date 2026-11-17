'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import { requestEmailVerification, syncEmailVerified } from '../../lib/auth';
import { ApiError } from '../../lib/api';

const RESEND_COOLDOWN_S = 30;

function safeNext(value: string | null): string {
  if (!value) return '/home';
  if (!value.startsWith('/') || value.startsWith('//')) return '/home';
  return value;
}

function useNextParam(): string {
  const [next, setNext] = useState('/home');
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search);
    setNext(safeNext(q.get('next')));
  }, []);
  return next;
}

export default function VerifyEmail() {
  const router = useRouter();
  const next = useNextParam();
  const { user, logout, refresh } = useAuth();

  const [cooldown, setCooldown] = useState(0);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [checking, setChecking] = useState(false);
  const [notYet, setNotYet] = useState(false);
  const timerRef = useRef<number | null>(null);
  const autoSentRef = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    timerRef.current = window.setInterval(() => {
      setCooldown(c => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [cooldown]);

  const resend = useCallback(async () => {
    setResendState(s => (s === 'sending' ? s : 'sending'));
    setMessage('');
    try {
      await requestEmailVerification();
      setResendState('sent');
      setCooldown(RESEND_COOLDOWN_S);
    } catch (err) {
      setResendState('error');
      if (err instanceof ApiError && err.status === 429) {
        setMessage('You’re asking for emails too quickly. Give it a minute and try again.');
        setCooldown(60);
      } else {
        setMessage('Could not send the email right now. Please try again shortly.');
      }
    }
  }, []);

  const onResendClick = () => {
    if (cooldown > 0 || resendState === 'sending') return;
    void resend();
  };

  // Auto-send the first verification email when the pending screen loads.
  // This is the single source of truth for the initial send (signup no
  // longer fires it, to avoid the redirect racing the fetch). Guarded by
  // a per-email sessionStorage flag so a refresh doesn't re-send.
  useEffect(() => {
    if (autoSentRef.current) return;
    const email = user?.email;
    if (!email) return;
    autoSentRef.current = true;
    const key = `kinloom.verif_sent.${email}`;
    if (typeof window !== 'undefined') {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, String(Date.now()));
    }
    void resend();
  }, [user?.email, resend]);

  const recheck = async () => {
    setChecking(true);
    setNotYet(false);
    setMessage('');
    try {
      const verified = await syncEmailVerified();
      if (verified) {
        await refresh();
        router.replace(next);
      } else {
        setNotYet(true);
      }
    } catch {
      // Stale sign-in (session cookie can only be re-minted from a recent
      // login). Ask them to sign in again — a fresh login mints a verified
      // session cookie and clears the gate.
      setMessage('For your security, please sign in again to finish verifying.');
    } finally {
      setChecking(false);
    }
  };

  const signOut = async () => {
    await logout();
    router.replace('/');
  };

  return (
    <div className="auth-page">
      <div className="auth-page__inner">
        <div className="auth-page__head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-kinloom.png" alt="Kinloom" className="auth-page__logo" />
          <h1 className="auth-page__title">Confirm your email</h1>
          <p className="auth-page__sub">
            We sent a verification link to{' '}
            <strong>{user?.email ?? 'your email'}</strong>. Open it to unlock your family space.
          </p>
        </div>

        <div className="auth-card">
          <div className="auth-form">
            {resendState === 'sent' && (
              <p className="auth-status auth-status--ok">Verification email sent. Check your inbox.</p>
            )}
            {notYet && (
              <p className="auth-status auth-status--error">
                Still not verified. Click the link in the email, then try again.
              </p>
            )}
            {message && <p className="auth-status auth-status--error">{message}</p>}

            <button type="button" onClick={recheck} disabled={checking} className="btn-primary btn-block">
              {checking ? 'Checking…' : 'I’ve verified my email'}
            </button>

            <button
              type="button"
              onClick={onResendClick}
              disabled={cooldown > 0 || resendState === 'sending'}
              className="btn-outline btn-block"
            >
              {resendState === 'sending'
                ? 'Sending…'
                : cooldown > 0
                  ? `Resend email (${cooldown}s)`
                  : 'Resend email'}
            </button>

            <p className="auth-note">
              Wrong account or need to start over?{' '}
              <button type="button" onClick={signOut} className="auth-link auth-linkbutton">
                Sign out
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
