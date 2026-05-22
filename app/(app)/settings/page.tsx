'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth-context';
import {
  changePassword,
  deleteAccount,
  updateProfile,
} from '../../../lib/auth';
import { ApiError } from '../../../lib/api';
import { revalidateSettingsData } from '../../actions';

export default function SettingsPage() {
  const { user, refresh, logout } = useAuth();
  const router = useRouter();

  // Profile form
  const [displayName, setDisplayName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  // Password modal
  const [pwOpen, setPwOpen] = useState(false);

  // Delete account modal
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (user) setDisplayName(user.display_name ?? user.name ?? '');
  }, [user]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setProfileMsg(null);
    setSavingProfile(true);
    try {
      await updateProfile({ display_name: displayName.trim() });
      await refresh();
      void revalidateSettingsData();
      router.refresh();
      setProfileMsg({ kind: 'ok', text: 'Profile updated.' });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.firstFieldError() ?? err.message
          : 'Could not update profile.';
      setProfileMsg({ kind: 'error', text: message });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteAccount();
    } catch {
      // even if it fails on the server, treat the user as logged out client-side
    } finally {
      logout();
      router.replace('/');
    }
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
              <label className="field-label" htmlFor="display-name">
                Display name
              </label>
              <input
                id="display-name"
                className="field-input"
                placeholder="Your name"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                maxLength={80}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                type="email"
                className="field-input"
                value={user?.email ?? ''}
                disabled
                readOnly
              />
            </div>
            <button
              type="submit"
              className="btn-save"
              disabled={savingProfile || !user}
            >
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
            Permanently delete your account and all your kinlooms. This cannot be undone.
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
  onConfirm: () => Promise<void> | void;
}) {
  const [confirmText, setConfirmText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const canConfirm = confirmText.trim().toUpperCase() === 'DELETE';

  async function handleConfirm() {
    if (!canConfirm) return;
    setSubmitting(true);
    await onConfirm();
  }

  return (
    <div
      className="modal-backdrop"
      onClick={e => { if (e.target === e.currentTarget && !submitting) onCancel(); }}
    >
      <div className="modal">
        <h3 className="modal-title">Delete account?</h3>
        <p className="modal-text">
          This permanently deletes your account, your kinlooms, and removes you from your
          family spaces. This cannot be undone.
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
            />
          </div>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn-outline"
            onClick={onCancel}
            disabled={submitting}
          >
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
