'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  updatePrivacySettings,
  type PrivacySettings,
} from '../../../../lib/auth';
import { ApiError } from '../../../../lib/api';
import { useActiveFamilySpace } from '../../../../lib/active-family-space';
import { revalidateSettingsData } from '../../../actions';

const ROWS: {
  key: keyof PrivacySettings;
  label: string;
  description: string;
  options: { value: string; label: string }[];
}[] = [
  {
    key: 'profile_visibility',
    label: 'Profile visibility',
    description: 'Who can see your name and profile in the family space.',
    options: [
      { value: 'family',      label: 'Family only' },
      { value: 'invite_only', label: 'Invite only' },
    ],
  },
  {
    key: 'default_kinloom_visibility',
    label: 'Default kinloom visibility',
    description: 'Default audience when you create a new kinloom.',
    options: [
      { value: 'family',  label: 'Family only' },
      { value: 'private', label: 'Only me' },
    ],
  },
  {
    key: 'ai_legacy_bank_access',
    label: 'AI Legacy Bank access',
    description: 'Who can ask the AI Legacy Bank questions about you.',
    options: [
      { value: 'family', label: 'Family only' },
      { value: 'none',   label: 'No one' },
    ],
  },
];

export default function PrivacyClient({ initial }: { initial: PrivacySettings }) {
  const router = useRouter();
  const { activeSpaceId } = useActiveFamilySpace();
  const [state, setState] = useState<PrivacySettings>(initial);
  const [pending, setPending] = useState<keyof PrivacySettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<keyof PrivacySettings | null>(null);

  async function update(key: keyof PrivacySettings, value: string) {
    if (pending) return;
    const prev = state[key];
    setState(s => ({ ...s, [key]: value }));
    setPending(key);
    setError(null);
    try {
      await updatePrivacySettings({ [key]: value } as Partial<PrivacySettings>, activeSpaceId);
      setSavedKey(key);
      setTimeout(() => setSavedKey(k => k === key ? null : k), 2000);
      void revalidateSettingsData();
      router.refresh();
    } catch (err) {
      setState(s => ({ ...s, [key]: prev }));
      const msg = err instanceof ApiError ? err.message : 'Could not update.';
      setError(msg);
    } finally {
      setPending(null);
    }
  }

  return (
    <div>
      <h1 className="settings-h1">Privacy & permissions</h1>
      <p className="settings-card-text">Control how your content and profile are shared within your family space.</p>

      {error && <p className="form-status form-status--error">{error}</p>}

      <div className="settings-stack">
        {ROWS.map(row => (
          <div key={row.key} className="card">
            <div className="privacy-row">
              <div>
                <p className="notif-row__label">{row.label}</p>
                <p className="notif-row__desc">{row.description}</p>
              </div>
              <div className="privacy-row__control">
                <select
                  className="privacy-row__select"
                  value={state[row.key] ?? ''}
                  onChange={e => update(row.key, e.target.value)}
                  disabled={pending !== null}
                >
                  {row.options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {savedKey === row.key && (
                  <span className="form-status form-status--ok">Saved</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="privacy-note">
        <p>
          Kinloom is private by design. Your content is never shared publicly and is never used to train AI models.
        </p>
      </div>
    </div>
  );
}
