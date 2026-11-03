'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  errorText,
  patchSettings,
  putLegacyContact,
  stopBeingLegacyContact,
  type MeLegacyContact,
  type MeLegacyContactFor,
  type Settings,
  type SettingsChanges,
} from '../../../../lib/settings';
import { revalidateSettingsData } from '../../../actions';

type Key = keyof Settings;

type Flash = { key: string; text: string } | null;

export default function PrivacyClient({
  initial,
  legacyContact,
  legacyContactFor,
  homeReadOnly,
}: {
  initial: Settings;
  legacyContact: MeLegacyContact | null;
  legacyContactFor: MeLegacyContactFor[];
  homeReadOnly: boolean;
}) {
  const [state, setState] = useState<Settings>(initial);
  const [pending, setPending] = useState<Set<Key>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Flash>(null);
  const inflight = useRef<Set<Key>>(new Set());

  /** Optimistic write of one key; only that key is taken from the answer. */
  async function change<K extends Key>(key: K, value: Settings[K]) {
    if (inflight.current.has(key)) return;
    const before = state[key];
    inflight.current.add(key);
    setPending(new Set(inflight.current));
    setState(s => ({ ...s, [key]: value }));
    setError(null);
    try {
      const next = await patchSettings({ [key]: value } as SettingsChanges);
      setState(s => ({ ...s, [key]: next[key] }));
      setSaved({ key, text: 'Saved' });
      setTimeout(() => setSaved(f => (f && f.key === key ? null : f)), 1800);
      void revalidateSettingsData();
    } catch (err) {
      setState(s => ({ ...s, [key]: before }));
      setError(errorText(err, 'Could not save that change.'));
    } finally {
      inflight.current.delete(key);
      setPending(new Set(inflight.current));
    }
  }

  const renderSwitch = ({ k, label, desc, disabled }: { k: Key & ('legacy_bank_enabled' | 'posthumous_release_all' | 'posthumous_carry_forward'); label: string; desc: string; disabled?: boolean }) => (
    <div className="notif-row">
      <div className="notif-row__body">
        <p className="notif-row__label" id={`${k}-label`}>{label}</p>
        <p className="notif-row__desc">{desc}</p>
      </div>
      <div className="privacy-row__control">
        {saved?.key === k && <span className="form-status form-status--ok">{saved.text}</span>}
        <button
          type="button"
          role="switch"
          aria-checked={state[k]}
          aria-labelledby={`${k}-label`}
          className={`toggle${state[k] ? ' is-on' : ''}${pending.has(k) || disabled ? ' is-disabled' : ''}`}
          onClick={() => change(k, !state[k])}
          disabled={pending.has(k) || disabled}
        >
          <span className="toggle__knob" />
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <h1 className="settings-h1">Privacy &amp; permissions</h1>
      <p className="settings-card-text">
        You decide who sees what you write. A kinloom stays in your Vault, private, until you publish it.
      </p>

      {error && <p className="form-status form-status--error" role="alert">{error}</p>}

      <div className="settings-stack">
        {/* ─── New kinlooms ─────────────────────────── */}
        <section className="card" aria-labelledby="sec-new">
          <h2 className="settings-h2 settings-h2--tight" id="sec-new">New kinlooms</h2>
          <div className="privacy-row">
            <div>
              <p className="notif-row__label" id="publish-label">When I finish a kinloom</p>
              <p className="notif-row__desc">
                What happens the first time you finish one without choosing who sees it. You can always
                change this for a single kinloom when you publish it.
              </p>
              {homeReadOnly && state.default_publish_target === 'home' && (
                <p className="notif-row__desc">
                  Your Family Home is read-only right now, so new kinlooms stay private for the moment.
                </p>
              )}
            </div>
            <div className="privacy-row__control">
              {saved?.key === 'default_publish_target' && <span className="form-status form-status--ok">Saved</span>}
              <select
                className="privacy-row__select"
                aria-labelledby="publish-label"
                value={state.default_publish_target}
                onChange={e => change('default_publish_target', e.target.value as Settings['default_publish_target'])}
                disabled={pending.has('default_publish_target')}
              >
                <option value="home">Publish to my Family Home</option>
                <option value="private">Keep it private in my Vault</option>
              </select>
            </div>
          </div>
        </section>

        {/* ─── Legacy Bank ──────────────────────────── */}
        <section className="card card--flush" aria-labelledby="sec-bank">
          <h2 className="settings-h2 settings-h2--tight settings-h2--pad" id="sec-bank">Legacy Bank</h2>
          {renderSwitch({
            k: 'legacy_bank_enabled',
            label: 'Let my family ask about me',
            desc: 'When this is off, no one can ask the Legacy Bank about you, and your kinlooms are left out of shared Space banks.',
          })}
          <div className="notif-row notif-row--top-border">
            <div className="notif-row__body">
              <p className="notif-row__label" id="voice-label">How it answers</p>
              <p className="notif-row__desc">The voice the Legacy Bank uses when it speaks about you.</p>
            </div>
            <div className="privacy-row__control">
              {saved?.key === 'legacy_bank_voice' && <span className="form-status form-status--ok">Saved</span>}
              <select
                className="privacy-row__select"
                aria-labelledby="voice-label"
                value={state.legacy_bank_voice}
                onChange={e => change('legacy_bank_voice', e.target.value as Settings['legacy_bank_voice'])}
                disabled={pending.has('legacy_bank_voice') || !state.legacy_bank_enabled}
              >
                <option value="third_person">About me (“She grew up in…”)</option>
                <option value="first_person">As me (“I grew up in…”)</option>
              </select>
            </div>
          </div>
        </section>

        {/* ─── After I pass ─────────────────────────── */}
        <section className="card card--flush" aria-labelledby="sec-pass">
          <h2 className="settings-h2 settings-h2--tight settings-h2--pad" id="sec-pass">After I pass</h2>
          <p className="notif-row__desc notif-row__desc--pad">
            These only happen if your legacy contact asks for your account to be memorialized, and
            never before.
          </p>
          {renderSwitch({
            k: 'posthumous_release_all',
            label: 'Share everything I never published',
            desc: 'Your finished kinlooms that were never published are shared with your Family Home, and only there.',
          })}
          <div className="notif-row--top-border">
            {renderSwitch({
              k: 'posthumous_carry_forward',
              label: 'Pass my home’s kinlooms on',
              desc: 'What was live in your Home goes to the Homes of people who left it, by leaving or merging. Never your “after I pass” kinlooms, and never a Family Space.',
            })}
          </div>
        </section>

        <LegacyContactCard contact={legacyContact} contactFor={legacyContactFor} />
      </div>

      <div className="privacy-note">
        <p>
          Kinloom is private by design. Your content is never shared publicly and is never used to
          train AI models.
        </p>
      </div>
    </div>
  );
}

// ─── Legacy contact ────────────────────────────────────────────

function LegacyContactCard({
  contact,
  contactFor,
}: {
  contact: MeLegacyContact | null;
  contactFor: MeLegacyContactFor[];
}) {
  const router = useRouter();
  const [current, setCurrent] = useState<MeLegacyContact | null>(contact);
  const [people, setPeople] = useState<MeLegacyContactFor[]>(contactFor);
  const [email, setEmail] = useState(contact?.email ?? '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [confirmStop, setConfirmStop] = useState<string | null>(null);

  const trimmed = email.trim().toLowerCase();
  const unchanged = trimmed === (current?.email ?? '');

  async function save(next: string | null) {
    setBusy(true);
    setMsg(null);
    try {
      const me = await putLegacyContact(next);
      setCurrent(me.legacy_contact);
      setEmail(me.legacy_contact?.email ?? '');
      setPeople(me.legacy_contact_for);
      void revalidateSettingsData();
      router.refresh();
      setMsg({
        kind: 'ok',
        text: me.legacy_contact
          ? 'Saved. We don’t email them, so let them know yourself.'
          : 'Removed. You have no legacy contact now.',
      });
    } catch (err) {
      setMsg({ kind: 'error', text: errorText(err, 'Could not save your legacy contact.') });
    } finally {
      setBusy(false);
    }
  }

  async function stop(personId: string) {
    setBusy(true);
    setMsg(null);
    try {
      const me = await stopBeingLegacyContact(personId);
      setPeople(me.legacy_contact_for);
      setConfirmStop(null);
      void revalidateSettingsData();
      router.refresh();
    } catch (err) {
      setMsg({ kind: 'error', text: errorText(err, 'Could not do that.') });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card" aria-labelledby="sec-contact">
      <h2 className="settings-h2 settings-h2--tight" id="sec-contact">Legacy contact</h2>
      <p className="settings-card-text">
        Someone you trust to speak for you. Once linked, they can ask for your account to be
        memorialized, and afterwards they can see where your kinlooms are published and withdraw them.
        Until then they see nothing of yours.
      </p>

      <form
        className="settings-fields"
        onSubmit={e => {
          e.preventDefault();
          if (!unchanged && trimmed) void save(trimmed);
        }}
      >
        <div>
          <label className="field-label" htmlFor="legacy-email">Their email address</label>
          <input
            id="legacy-email"
            type="email"
            className="field-input"
            placeholder="name@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            maxLength={255}
            autoComplete="off"
            disabled={busy}
          />
          {current && (
            <p className="field-hint">
              {current.status === 'linked'
                ? 'Linked. They’ve signed in with this address.'
                : 'Waiting. They’ll be linked the first time they sign in to Kinloom with this verified address.'}
            </p>
          )}
        </div>
        {msg && (
          <p className={`form-status form-status--${msg.kind === 'ok' ? 'ok' : 'error'}`} role={msg.kind === 'error' ? 'alert' : undefined}>
            {msg.text}
          </p>
        )}
        <div className="vis-row">
          <button type="submit" className="btn-save" disabled={busy || unchanged || !trimmed}>
            {busy ? 'Saving…' : current ? 'Change contact' : 'Save contact'}
          </button>
          {current && (
            <button type="button" className="btn-outline" onClick={() => void save(null)} disabled={busy}>
              Remove
            </button>
          )}
        </div>
        {current && !unchanged && trimmed && (
          <p className="field-hint">Naming someone else ends the current link right away.</p>
        )}
      </form>

      {people.length > 0 && (
        <div className="legacy-for">
          <h3 className="legacy-for__title">People who named you</h3>
          <ul className="legacy-for__list">
            {people.map(p => (
              <li key={p.person_id} className="legacy-for__row">
                <span>{p.name}</span>
                {confirmStop === p.person_id ? (
                  <span className="vis-row">
                    <button type="button" className="btn-danger-outline" onClick={() => void stop(p.person_id)} disabled={busy}>
                      Yes, stop
                    </button>
                    <button type="button" className="btn-outline" onClick={() => setConfirmStop(null)} disabled={busy}>
                      Keep
                    </button>
                  </span>
                ) : (
                  <button type="button" className="btn-outline" onClick={() => setConfirmStop(p.person_id)} disabled={busy}>
                    Stop being their contact
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
