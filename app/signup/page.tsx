'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';
import { ApiError } from '../../lib/api';

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
  const router = useRouter();
  const next = useNextParam();
  const { user, loading: authLoading, register } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      // New accounts must verify their email before entering the app.
      // Carry any `next` (e.g. an invite link) through the pending screen.
      const dest = next
        ? `/verify-email?next=${encodeURIComponent(next)}`
        : '/verify-email';
      router.replace(dest);
    }
  }, [authLoading, user, router, next]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== passwordConfirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        password_confirmation: passwordConfirm,
      });
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
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', background: '#f5f4f1',
    border: '1px solid transparent', borderRadius: 8, fontSize: 15,
    fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 14, color: '#1a1a1a', marginBottom: 6,
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
              <label style={labelStyle}>Your name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                maxLength={255}
                autoComplete="name"
                placeholder="Jane Doe"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@family.com"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Minimum 8 characters"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Confirm password</label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={e => setPasswordConfirm(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Re-enter password"
                style={inputStyle}
              />
            </div>

            {error && (
              <p style={{ fontSize: 14, color: '#d4183d', margin: 0 }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', background: '#556b5b', color: '#fdfcfa', border: 'none', padding: '14px', borderRadius: 8, fontSize: 15, fontWeight: 500, fontFamily: 'inherit', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 8 }}
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
