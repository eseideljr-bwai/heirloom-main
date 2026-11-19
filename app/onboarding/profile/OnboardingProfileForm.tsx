'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { onboardingProfile } from '../../../lib/auth';
import { useAuth } from '../../../lib/auth-context';
import { revalidateAllData } from '../../actions';
import { ApiError } from '../../../lib/api';

type Gender = 'f' | 'm' | 'n';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const TODAY = new Date();
const THIS_YEAR = TODAY.getFullYear();
const THIS_MONTH = TODAY.getMonth() + 1;
// The API takes dates from 1900-01-01 to today.
const YEARS = Array.from({ length: THIS_YEAR - 1900 + 1 }, (_, i) => THIS_YEAR - i);

const GENDERS: { id: Gender; label: string }[] = [
  { id: 'm', label: 'Male' },
  { id: 'f', label: 'Female' },
  { id: 'n', label: 'Prefer not to say' },
];

/** Months you can pick: none past this one in the current year. */
function monthsIn(year: string): number {
  return Number(year) === THIS_YEAR ? THIS_MONTH : 12;
}

/**
 * Days you can pick: February counts 29 until a non-leap year is picked,
 * and the current month stops at today.
 */
function daysIn(month: string, year: string): number {
  if (!month) return 31;
  if (Number(year) === THIS_YEAR && Number(month) === THIS_MONTH) return TODAY.getDate();
  return new Date(year ? Number(year) : 2000, Number(month), 0).getDate();
}

export default function OnboardingProfileForm() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxDay = daysIn(birthMonth, birthYear);
  // Date of birth is optional, but all three parts or none.
  const dobPartial = [birthMonth, birthDay, birthYear].some(Boolean)
    && ![birthMonth, birthDay, birthYear].every(Boolean);
  const canSubmit = !!firstName.trim() && !!familyName.trim() && !dobPartial;

  // Changing month or year can leave the picked month or day out of range
  // (past the month's end, or later than today).
  const clampDay = (month: string, year: string) => {
    if (month && Number(month) > monthsIn(year)) {
      setBirthMonth('');
      setBirthDay('');
      return;
    }
    if (birthDay && Number(birthDay) > daysIn(month, year)) setBirthDay('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      // Names the account and your Home ("The {family name} Home") and
      // completes onboarding. It creates no Family Space: a Home already
      // exists, and Spaces are something you join or start later.
      await onboardingProfile({
        first_name: firstName.trim(),
        family_name: familyName.trim(),
        ...(birthYear && {
          birth_date: `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`,
        }),
        ...(gender && { gender }),
      });
      await refresh();
      void revalidateAllData();
      router.push('/onboarding/photo');
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

          <div>
            <label className="auth-label" htmlFor="dob-month">Date of birth <span style={{ color: 'var(--fg-3)' }}>(optional)</span></label>
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1.2fr', gap: 12 }}>
              <select
                id="dob-month"
                aria-label="Birth month"
                value={birthMonth}
                onChange={e => { setBirthMonth(e.target.value); clampDay(e.target.value, birthYear); }}
                className="auth-input"
              >
                <option value="">Month</option>
                {MONTHS.slice(0, monthsIn(birthYear)).map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
              </select>
              <select
                aria-label="Birth day"
                value={birthDay}
                onChange={e => setBirthDay(e.target.value)}
                className="auth-input"
              >
                <option value="">Day</option>
                {Array.from({ length: maxDay }, (_, i) => i + 1).map(d => (
                  <option key={d} value={String(d)}>{d}</option>
                ))}
              </select>
              <select
                aria-label="Birth year"
                value={birthYear}
                onChange={e => { setBirthYear(e.target.value); clampDay(birthMonth, e.target.value); }}
                className="auth-input"
              >
                <option value="">Year</option>
                {YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
              </select>
            </div>
            {dobPartial && (
              <p style={{ fontSize: 13, color: 'var(--fg-3)', margin: '6px 0 0' }}>
                Pick a month, day and year, or leave all three blank.
              </p>
            )}
          </div>

          <div>
            <p className="auth-label" id="gender-label">Gender <span style={{ color: 'var(--fg-3)' }}>(optional)</span></p>
            <div className="vis-row vis-row--wrap" role="radiogroup" aria-labelledby="gender-label">
              {GENDERS.map(g => (
                <button
                  key={g.id}
                  type="button"
                  role="radio"
                  aria-checked={gender === g.id}
                  className={`vis-chip${gender === g.id ? ' is-active' : ''}`}
                  onClick={() => setGender(gender === g.id ? null : g.id)}
                  disabled={saving}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="create-banner create-banner--error" style={{ margin: 0 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={saving || !canSubmit}
            className="btn-disabled-soft"
            style={{ background: '#556b5b', color: '#fdfcfa', border: 'none', padding: '14px', borderRadius: 8, fontSize: 15, fontWeight: 500, fontFamily: 'inherit', cursor: (saving || !canSubmit) ? 'not-allowed' : 'pointer', marginTop: 8 }}
          >
            {saving ? 'Saving…' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
