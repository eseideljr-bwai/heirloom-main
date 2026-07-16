'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../lib/auth-context';
import { ApiError } from '../lib/api';

function safeNext(value: string | null | undefined): string {
  if (!value) return '/home';
  // Only allow same-origin paths to avoid open-redirect.
  if (!value.startsWith('/') || value.startsWith('//')) return '/home';
  return value;
}

/**
 * Reading `?next=` via `window.location` (inside a client component
 * useEffect) avoids `useSearchParams`, which would force a Suspense
 * boundary or block this page from being statically prerendered — and
 * trips Next.js's pages-router error-fallback prerender during build.
 */
function useNextParam(): string {
  const [next, setNext] = useState('/home');
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    setNext(safeNext(params.get('next')));
  }, []);
  return next;
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const next = useNextParam();
  const { user, loading: authLoading, login } = useAuth();

  useEffect(() => {
    if (!authLoading && user) router.replace(next);
  }, [authLoading, user, router, next]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      // Effect above redirects once `user` populates.
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        // Use the same message for "wrong password", "no such user", and
        // most 4xx errors so attackers can't enumerate registered emails.
        if (err.status >= 400 && err.status < 500 && err.status !== 422) {
          setError('Invalid email or password.');
        } else if (err.status === 422) {
          setError(err.firstFieldError() ?? 'Please check your credentials.');
        } else {
          setError(err.message);
        }
      } else {
        setError(err instanceof Error ? err.message : 'Login failed.');
      }
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fdfcfa', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>

        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-kinloom.png" alt="Kinloom" style={{ height: 80, width: 'auto', margin: '0 auto 24px' }} />
          <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 32, lineHeight: 1.2, margin: '0 0 8px', color: '#1a1a1a' }}>Welcome back</h1>
          <p style={{ fontSize: 15, color: 'rgba(26,26,26,0.7)', margin: 0 }}>Sign in to your family space</p>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #d4d2cc', borderRadius: 16, padding: 32, boxShadow: '0 10px 30px -8px rgba(0,0,0,0.05)' }}>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 14, color: '#1a1a1a', marginBottom: 6 }}>Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@family.com"
                style={{ width: '100%', padding: '12px 14px', background: '#f5f4f1', border: '1px solid transparent', borderRadius: 8, fontSize: 15, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 14, color: '#1a1a1a', marginBottom: 6 }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                style={{ width: '100%', padding: '12px 14px', background: '#f5f4f1', border: '1px solid transparent', borderRadius: 8, fontSize: 15, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
              />
              <Link href="/forgot-password" className="auth-forgot">Forgot password?</Link>
            </div>

            {error && <p style={{ fontSize: 14, color: '#d4183d', margin: 0 }}>{error}</p>}

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', background: '#556b5b', color: '#fdfcfa', border: 'none', padding: '14px', borderRadius: 8, fontSize: 15, fontWeight: 500, fontFamily: 'inherit', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 8 }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 14, color: 'rgba(26,26,26,0.7)', margin: '24px 0 0' }}>
          Don&apos;t have an account?{' '}
          <Link href="/signup" style={{ color: '#556b5b', textDecoration: 'none', fontWeight: 500 }}>Create one</Link>
        </p>

      </div>
    </div>
  );
}
