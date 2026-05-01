'use client';

import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      router.push('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Signup failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fdfcfa', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>

        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-kinloom.png" alt="Kinloom" style={{ height: 80, width: 'auto', margin: '0 auto 24px' }} />
          <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 32, lineHeight: 1.2, margin: '0 0 8px', color: '#1a1a1a' }}>Join the Waitlist</h1>
          <p style={{ fontSize: 15, color: 'rgba(26,26,26,0.7)', margin: 0 }}>Be among the first to preserve your family's legacy</p>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #d4d2cc', borderRadius: 16, padding: 32, boxShadow: '0 10px 30px -8px rgba(0,0,0,0.05)' }}>
          <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                placeholder="Minimum 6 characters"
                style={{ width: '100%', padding: '12px 14px', background: '#f5f4f1', border: '1px solid transparent', borderRadius: 8, fontSize: 15, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
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
              {loading ? 'Creating account…' : 'Request Access'}
            </button>

            <p style={{ fontSize: 13, color: '#6b6b6b', textAlign: 'center', margin: 0 }}>
              Private by design. We won't share your email.
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
