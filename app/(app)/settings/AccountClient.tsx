'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth-context';
import Link from 'next/link';
import { changePassword, deleteAccount } from '../../../lib/auth';
import { ApiError } from '../../../lib/api';
import { errorText, patchProfile, type Profile, type ProfileChanges } from '../../../lib/settings';
import { revalidateAllData } from '../../actions';

const PLAN_LABEL: Record<string, string> = { free: 'Free', home: 'Home', family: 'Family' };

export default function AccountClient({ initial, plan }: { initial: Profile; plan: string }) {
  const { refresh, logout } = useAuth();
  const router = useRouter();

  // Profile form: `saved` is what the API last returned, so the Save button
  // only lights up for a real change and only changed fields are sent.
  const [saved, setSaved] = useState<Profile>(initial);
  const [name, setName] = useState(initial.name);
  const [displayName, setDisplayName] = useState(initial.display_name ?? '');
  const [about, setAbout] = useState(initial.description ?? '');
  const [birthYear, setBirthYear] = useState(
    initial.person.birth_year != null ? String(initial.person.birth_year) : '',
  );
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  // Password modal
  const [pwOpen, setPwOpen] = useState(false);

  // Delete account modal
  const [deleteOpen, setDeleteOpen] = useState(false);

  const yearNum = birthYear.trim() === '' ? null : Number(birthYear.trim());
  const yearInvalid = yearNum !== null && (!Number.isInteger(yearNum) || yearNum < 1 || yearNum > new Date().getFullYear());

  /** Only the fields the person changed, in the API's terms. */
  function changes(): ProfileChanges {
    const out: ProfileChanges = {};
    if (name.trim() !== saved.name) out.name = name.trim();
    if (displayName.trim() !== (saved.display_name ?? '')) out.display_name = displayName.trim() || null;
    if (about.trim() !== (saved.description ?? '')) out.description = about.trim() || null;
    if (yearNum !== (saved.person.birth_year ?? null)) out.birth_year = yearNum;
    return out;
  }
  const diff = changes();
  const dirty = Object.keys(diff).length > 0;
  const canSave = dirty && name.trim().length > 0 && !yearInvalid && !savingProfile;

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setProfileMsg(null);
    setSavingProfile(true);
    try {
      const next = await patchProfile(diff);
      setSaved(next);
      setName(next.name);
      setDisplayName(next.display_name ?? '');
      setAbout(next.description ?? '');
      setBirthYear(next.person.birth_year != null ? String(next.person.birth_year) : '');
      await refresh();
      void revalidateAllData(); // your name appears across the app
      router.refresh();
      setProfileMsg({ kind: 'ok', text: 'Saved.' });
      setTimeout(() => setProfileMsg(curr => (curr && curr.kind === 'ok' ? null : curr)), 2500);
    } catch (err) {
      setProfileMsg({ kind: 'error', text: errorText(err, 'Could not save your profile.') });
    } finally {
      setSavingProfile(false);
    }
  }

  /** Throws on a refused delete so the modal can say why; only a real success signs out. */
  async function handleDelete() {
    await deleteAccount();
    await logout();
    router.replace('/');
  }

  return (
    <div>
      <h1 className="settings-h1">Account</h1>

      <div className="settings-stack">
        {/* ─── Profile ──────────────────────────────── */}
        <form onSubmit={handleSaveProfile} className="card">
          <h2 className="settings-h2">Profile</h2>
          <div className="settings-fields">
            <div>
              <label className="field-label" htmlFor="full-name">Full name</label>
              <input
                id="full-name"
                className="field-input"
                placeholder="Your full name"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={255}
                autoComplete="name"
                required
              />
              <p className="field-hint">Shown to your family wherever you appear.</p>
            </div>
            <div>
              <label className="field-label" htmlFor="display-name">Short name</label>
              <input
                id="display-name"
                className="field-input"
                placeholder="What should we call you?"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                maxLength={255}
              />
              <p className="field-hint">Used in greetings. Leave it empty to use your full name.</p>
            </div>
            <div>
              <label className="field-label" htmlFor="birth-year">Birth year</label>
              <input
                id="birth-year"
                className="field-input"
                inputMode="numeric"
                placeholder="e.g. 1962"
                value={birthYear}
                onChange={e => setBirthYear(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
              />
              {yearInvalid && <p className="form-status form-status--error">Enter a four-digit year.</p>}
            </div>
            <div>
              <label className="field-label" htmlFor="about">About you</label>
              <textarea
                id="about"
                className="field-input field-input--area"
                rows={4}
                placeholder="A few words your family might want to know."
                value={about}
                onChange={e => setAbout(e.target.value)}
                maxLength={2000}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                className="field-input"
                value={saved.email}
                disabled
                readOnly
              />
              <p className="field-hint">This is your sign-in address.</p>
            </div>
            <button type="submit" className="btn-save" disabled={!canSave}>
              {savingProfile ? 'Saving…' : 'Save changes'}
            </button>
            {profileMsg && (
              <p
                className={
                  profileMsg.kind === 'ok'
                    ? 'form-status form-status--ok'
                    : 'form-status form-status--error'
                }
              >
                {profileMsg.text}
              </p>
            )}
          </div>
        </form>

        {/* ─── Plan ─────────────────────────────────── */}
        <div className="card">
          <h2 className="settings-h2 settings-h2--tight">Plan</h2>
          <p className="settings-card-text settings-card-text--flush">
            You’re on the <strong>{PLAN_LABEL[plan] ?? plan}</strong> plan.
          </p>
        </div>

        {/* ─── Password ─────────────────────────────── */}
        <div className="card">
          <h2 className="settings-h2 settings-h2--tight">Password</h2>
          <p className="settings-card-text">Change your account password.</p>
          <button
            type="button"
            className="btn-outline"
            onClick={() => setPwOpen(true)}
          >
            Change password
          </button>
        </div>

        {/* ─── Delete account ───────────────────────── */}
        <div className="card-danger">
          <h2 className="settings-h2 settings-h2--tight">Delete account</h2>
          <p className="settings-card-text">
            Permanently delete your account and everything you’ve written. This cannot be undone.{' '}
            <Link href="/settings/export">Export your kinlooms first.</Link>
          </p>
          <button
            type="button"
            className="btn-danger-outline"
            onClick={() => setDeleteOpen(true)}
          >
            Delete account
          </button>
        </div>
      </div>

      {pwOpen && <ChangePasswordModal onClose={() => setPwOpen(false)} />}

      {deleteOpen && (
        <DeleteAccountModal
          onCancel={() => setDeleteOpen(false)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

// ─── Change password modal ─────────────────────────────────

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (next.length < 8) {
      setMsg({ kind: 'error', text: 'New password must be at least 8 characters.' });
      return;
    }
    if (next !== confirm) {
      setMsg({ kind: 'error', text: 'New password and confirmation do not match.' });
      return;
    }

    setSubmitting(true);
    try {
      await changePassword({
        current_password: current,
        new_password: next,
        new_password_confirmation: confirm,
      });
      setMsg({ kind: 'ok', text: 'Password updated.' });
      setCurrent(''); setNext(''); setConfirm('');
      setTimeout(onClose, 800);
    } catch (err) {
      const text =
        err instanceof ApiError
          ? err.firstFieldError() ?? err.message
          : 'Could not change password.';
      setMsg({ kind: 'error', text });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <form className="modal" onSubmit={handleSubmit}>
        <h3 className="modal-title">Change password</h3>
        <p className="modal-text">Enter your current password and choose a new one.</p>

        <div className="settings-fields">
          <div>
            <label className="field-label" htmlFor="pw-current">Current password</label>
            <input
              id="pw-current"
              type="password"
              className="field-input"
              value={current}
              onChange={e => setCurrent(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <div>
            <label className="field-label" htmlFor="pw-new">New password</label>
            <input
              id="pw-new"
              type="password"
              className="field-input"
              value={next}
              onChange={e => setNext(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <div>
            <label className="field-label" htmlFor="pw-confirm">Confirm new password</label>
            <input
              id="pw-confirm"
              type="password"
              className="field-input"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          {msg && (
            <p
              className={
                msg.kind === 'ok'
                  ? 'form-status form-status--ok'
                  : 'form-status form-status--error'
              }
            >
              {msg.text}
            </p>
          )}
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-outline" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn-save" disabled={submitting}>
            {submitting ? 'Updating…' : 'Update password'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Delete account modal ──────────────────────────────────

function DeleteAccountModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [confirmText, setConfirmText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canConfirm = confirmText.trim().toUpperCase() === 'DELETE';

  async function handleConfirm() {
    if (!canConfirm || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      // The account is still there: say so, and let them try again.
      setError(errorText(err, 'Could not delete your account. Nothing was changed.'));
      setSubmitting(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={e => { if (e.target === e.currentTarget && !submitting) onCancel(); }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="delete-title">
        <h3 className="modal-title" id="delete-title">Delete your account?</h3>
        <p className="modal-text">This is permanent. There is no undo.</p>
        <ul className="modal-list">
          <li>Every kinloom you wrote is deleted, with its photos, recordings, comments and holds.</li>
          <li>Your comments and holds on other people’s kinlooms are removed.</li>
          <li>
            If you own your Family Home, its successor (or a co-owner) takes over. A Home with no one
            left in it is closed.
          </li>
          <li>Your Legacy Bank conversations, exports and settings are deleted.</li>
        </ul>
        <p className="modal-text">
          Want a copy first? <Link href="/settings/export">Export your kinlooms</Link>.
        </p>

        <div className="settings-fields">
          <div>
            <label className="field-label" htmlFor="confirm-delete">
              Type <strong>DELETE</strong> to confirm
            </label>
            <input
              id="confirm-delete"
              className="field-input"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              autoComplete="off"
              disabled={submitting}
            />
          </div>
          {error && <p className="form-status form-status--error">{error}</p>}
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-danger-solid"
            onClick={handleConfirm}
            disabled={!canConfirm || submitting}
          >
            {submitting ? 'Deleting…' : 'Delete account'}
          </button>
        </div>
      </div>
    </div>
  );
}
