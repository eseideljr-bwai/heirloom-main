'use client';

import { useRef, useState } from 'react';
import { errorText, patchSettings, type Settings } from '../../../../lib/settings';
import { revalidateSettingsData } from '../../../actions';

type Key = 'notify_family_activity' | 'notify_new_members' | 'notify_create_reminders' | 'notify_legacy_bank_responses';

const ITEMS: { key: Key; label: string; description: string }[] = [
  { key: 'notify_family_activity',       label: 'Family activity',          description: 'When someone in your home writes or shares a kinloom.' },
  { key: 'notify_new_members',           label: 'New people in your home',  description: 'When someone joins your Family Home.' },
  { key: 'notify_create_reminders',      label: 'Reminders to create',      description: 'A gentle prompt to capture something new.' },
  { key: 'notify_legacy_bank_responses', label: 'Legacy Bank answers',      description: 'When an answer is ready in the Legacy Bank.' },
];

export default function NotificationsClient({ initial }: { initial: Settings }) {
  const [state, setState] = useState<Settings>(initial);
  const [pending, setPending] = useState<Set<Key>>(new Set());
  const [error, setError] = useState<string | null>(null);
  // Latest intent per key, so quick double taps on different rows can't clobber each other.
  const inflight = useRef<Set<Key>>(new Set());

  async function toggle(key: Key) {
    if (inflight.current.has(key)) return;
    inflight.current.add(key);
    const before = state[key];
    setState(s => ({ ...s, [key]: !before }));
    setPending(new Set(inflight.current));
    setError(null);
    try {
      const next = await patchSettings({ [key]: !before });
      // Keep the other rows as the person sees them; take only this key from the answer.
      setState(s => ({ ...s, [key]: next[key] }));
      void revalidateSettingsData();
    } catch (err) {
      setState(s => ({ ...s, [key]: before }));
      setError(errorText(err, 'Could not save that change.'));
    } finally {
      inflight.current.delete(key);
      setPending(new Set(inflight.current));
    }
  }

  return (
    <div>
      <h1 className="settings-h1">Notifications</h1>
      <p className="settings-card-text">Choose what you’d like to hear about.</p>

      <div className="privacy-note privacy-note--top">
        <p>
          Kinloom doesn’t send notifications yet. Your choices are saved now and will apply the
          moment it does.
        </p>
      </div>

      {error && <p className="form-status form-status--error" role="alert">{error}</p>}

      <div className="card">
        {ITEMS.map((item, i) => (
          <div key={item.key} className={`notif-row${i < ITEMS.length - 1 ? ' notif-row--bordered' : ''}`}>
            <div className="notif-row__body">
              <p className="notif-row__label" id={`${item.key}-label`}>{item.label}</p>
              <p className="notif-row__desc">{item.description}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={state[item.key]}
              aria-labelledby={`${item.key}-label`}
              className={`toggle${state[item.key] ? ' is-on' : ''}${pending.has(item.key) ? ' is-disabled' : ''}`}
              onClick={() => toggle(item.key)}
              disabled={pending.has(item.key)}
            >
              <span className="toggle__knob" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
