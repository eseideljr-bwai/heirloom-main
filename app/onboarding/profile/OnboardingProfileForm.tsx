'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { onboardingProfile } from '../../../lib/auth';
import { useAuth } from '../../../lib/auth-context';
import { useActiveFamilySpace } from '../../../lib/active-family-space';
import { revalidateAllData } from '../../actions';
import { ApiError } from '../../../lib/api';

const ROLES = ['Parent', 'Grandparent', 'Sibling', 'Child', 'Spouse', 'Other'];

export default function OnboardingProfileForm() {
  const router = useRouter();
  const { refresh, upsertFamilySpace } = useAuth();
  const { setActiveSpaceId } = useActiveFamilySpace();
  const [firstName, setFirstName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [role, setRole] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await onboardingProfile({
        first_name: firstName.trim(),
        family_name: familyName.trim() || null,
        role: role || null,
      });
      // Seed the space from the response before leaning on /me. `refresh()`
      // swallows its own failures, so relying on it alone meant a hiccup here
      // left the user with no space — and the next step, plus every guard,
      // read that as "still needs onboarding".
      if (res?.family_space?.ulid) {
        upsertFamilySpace({
          ulid: res.family_space.ulid,
          name: res.family_space.name,
          member_id: res.member?.member_id,
          role: 'owner',
        });
        await setActiveSpaceId(res.family_space.ulid);
      }
      await refresh();
      void revalidateAllData();
      router.push('/onboarding/first-kinloom');
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
        This helps your family understand who you are in the space.
      </p>

      <div style={{ background: '#fff', border: '1px solid #d4d2cc', borderRadius: 16, padding: 32, boxShadow: '0 4px 12px -2px rgba(0,0,0,0.06)' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="name-pair">
            <div>
              <label style={{ display: 'block', fontSize: 14, color: '#1a1a1a', marginBottom: 6 }}>First name</label>
              <input
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                required
                placeholder="Your first name"
                style={{ width: '100%', padding: '12px 14px', background: '#f5f4f1', border: '1px solid transparent', borderRadius: 8, fontSize: 15, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 14, color: '#1a1a1a', marginBottom: 6 }}>Family name</label>
              <input
                value={familyName}
                onChange={e => setFamilyName(e.target.value)}
                placeholder="Your family name"
                style={{ width: '100%', padding: '12px 14px', background: '#f5f4f1', border: '1px solid transparent', borderRadius: 8, fontSize: 15, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 14, color: '#1a1a1a', marginBottom: 10 }}>Your role in the family</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {ROLES.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  style={{
                    padding: '8px 16px', borderRadius: 9999, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
                    background: role === r ? '#556b5b' : '#f5f4f1',
                    color: role === r ? '#fdfcfa' : 'rgba(26,26,26,0.7)',
                    border: role === r ? '1px solid #556b5b' : '1px solid transparent',
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="create-banner create-banner--error" style={{ margin: 0 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={saving || !firstName.trim()}
            className="btn-disabled-soft"
            style={{ background: '#556b5b', color: '#fdfcfa', border: 'none', padding: '14px', borderRadius: 8, fontSize: 15, fontWeight: 500, fontFamily: 'inherit', cursor: (saving || !firstName.trim()) ? 'not-allowed' : 'pointer', marginTop: 8 }}
          >
            {saving ? 'Saving…' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
