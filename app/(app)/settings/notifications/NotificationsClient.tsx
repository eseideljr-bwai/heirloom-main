'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  updateNotificationSettings,
  type NotificationSettings,
} from '../../../../lib/auth';
import { ApiError } from '../../../../lib/api';
import { useActiveFamilySpace } from '../../../../lib/active-family-space';
import { revalidateSettingsData } from '../../../actions';

const ITEMS: { key: keyof NotificationSettings; label: string; description: string }[] = [
  { key: 'family_activity',       label: 'Family activity',          description: 'When a family member creates or shares a kinloom.' },
  { key: 'new_members',           label: 'New family members',       description: 'When someone joins your family space.' },
  { key: 'create_reminders',      label: 'Reminders to create',      description: 'Periodic prompts to capture something new.' },
  { key: 'legacy_bank_responses', label: 'AI Legacy Bank responses', description: 'When a response is generated in the Legacy Bank.' },
];

export default function NotificationsClient({
  initial,
}: {
  initial: NotificationSettings;
}) {
  const router = useRouter();
  const { activeSpaceId } = useActiveFamilySpace();
  const [state, setState] = useState<NotificationSettings>(initial);
  const [pending, setPending] = useState<keyof NotificationSettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(key: keyof NotificationSettings) {
    if (pending) return;
    const next = !state[key];
    const prev = state[key];
    setState(s => ({ ...s, [key]: next }));
    setPending(key);
    setError(null);
    try {
      await updateNotificationSettings({ [key]: next } as Partial<NotificationSettings>, activeSpaceId);
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
      <h1 className="settings-h1">Notifications</h1>
      <p className="settings-card-text">Choose what you want to be notified about.</p>

      {error && <p className="form-status form-status--error">{error}</p>}

      <div className="card">
        {ITEMS.map((item, i) => (
          <div key={item.key} className={`notif-row${i < ITEMS.length - 1 ? ' notif-row--bordered' : ''}`}>
            <div className="notif-row__body">
              <p className="notif-row__label">{item.label}</p>
              <p className="notif-row__desc">{item.description}</p>
            </div>
            <button
              type="button"
              className={`toggle${state[item.key] ? ' is-on' : ''}${pending === item.key ? ' is-disabled' : ''}`}
              onClick={() => toggle(item.key)}
              aria-pressed={state[item.key]}
              aria-label={item.label}
              disabled={pending !== null}
            >
              <span className="toggle__knob" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
