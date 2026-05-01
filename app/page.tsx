'use client';

import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Redirect already-authenticated users to /home
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      if (u) router.replace('/home');
    });
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged above handles the redirect — keep loading until it fires
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed.');
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
                placeholder="••••••••"
                style={{ width: '100%', padding: '12px 14px', background: '#f5f4f1', border: '1px solid transparent', borderRadius: 8, fontSize: 15, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
              />
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
          Don't have an account?{' '}
          <Link href="/signup" style={{ color: '#556b5b', textDecoration: 'none', fontWeight: 500 }}>Create one</Link>
        </p>

      </div>
    </div>
  );
}
