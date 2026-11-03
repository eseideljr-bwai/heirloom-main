'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { onboardingProfile } from '../../../lib/auth';
import { useAuth } from '../../../lib/auth-context';
import { revalidateAllData } from '../../actions';
import { ApiError } from '../../../lib/api';

export default function OnboardingProfileForm() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !familyName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      // Names the account and your Home ("The {family name} Home") and
      // completes onboarding. It creates no Family Space: a Home already
      // exists, and Spaces are something you join or start later.
      await onboardingProfile({
        first_name: firstName.trim(),
        family_name: familyName.trim(),
      });
      await refresh();
      void revalidateAllData();
      router.push('/home');
    } catch (err) {
      const msg = err instanceof ApiError ? (err.firstFieldError() || err.message) : 'Could not save your profile.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '64px auto', padding: '0 32px' }}>
      <p style={{ fontSize: 13, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#556b5b', margin: '0 0 16px' }}>
        Your profile
      </p>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 40, lineHeight: 1.15, margin: '0 0 8px', color: '#1a1a1a' }}>
        Tell us a little about yourself.
      </h1>
      <p style={{ fontSize: 16, lineHeight: 1.65, color: 'rgba(26,26,26,0.7)', margin: '0 0 40px' }}>
        This is how your family will know you, and what your Family Home is called.
      </p>

      <div style={{ background: '#fff', border: '1px solid #d4d2cc', borderRadius: 16, padding: 32, boxShadow: '0 4px 12px -2px rgba(0,0,0,0.06)' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="name-pair">
            <div>
              <label className="auth-label">First name</label>
              <input
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                required
                placeholder="Your first name"
                className="auth-input"
              />
            </div>
            <div>
              <label className="auth-label">Family name</label>
              <input
                value={familyName}
                onChange={e => setFamilyName(e.target.value)}
                required
                placeholder="Your family name"
                className="auth-input"
              />
            </div>
          </div>

          {error && (
            <p className="create-banner create-banner--error" style={{ margin: 0 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={saving || !firstName.trim() || !familyName.trim()}
            className="btn-disabled-soft"
            style={{ background: '#556b5b', color: '#fdfcfa', border: 'none', padding: '14px', borderRadius: 8, fontSize: 15, fontWeight: 500, fontFamily: 'inherit', cursor: (saving || !firstName.trim() || !familyName.trim()) ? 'not-allowed' : 'pointer', marginTop: 8 }}
          >
            {saving ? 'Saving…' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
