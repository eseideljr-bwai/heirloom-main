'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  createInvitation,
  createMember,
  deleteMember,
  revokeInvitation,
  updateMember,
  type CreateInvitationResponse,
  type Gender,
  type InviteRole,
} from '../../../../lib/family';
import { ApiError } from '../../../../lib/api';
import { firebaseAuth } from '../../../../lib/firebase-client';
import { syncSessionRefresh } from '../../../../lib/auth';
import type { FamilyMember, PendingInvitation } from '../../../../lib/server/queries';
import { revalidateFamilyData } from '../../../actions';

type Props = {
  familySpaceId: string;
  members: FamilyMember[];
  pending: PendingInvitation[];
  /** Whether the current viewer is an owner of this space — gates write actions. */
  isOwner: boolean;
};

type Modal =
  | { kind: 'invite' }
  | { kind: 'add-member' }
  | { kind: 'edit-member'; member: FamilyMember }
  | { kind: 'remove-member'; member: FamilyMember }
  | { kind: 'revoke-invite'; invitation: PendingInvitation }
  | null;

export default function MembersClient({ familySpaceId, members, pending, isOwner }: Props) {
  const router = useRouter();
  const [modal, setModal] = useState<Modal>(null);

  const close = () => setModal(null);
  const refresh = async () => {
    await revalidateFamilyData();
    router.refresh();
  };

  return (
    <>
      <div className="manage-page__header">
        <div>
          <p className="eyebrow manage-page__eyebrow">Members</p>
          <h1 className="manage-page__title">
            {isOwner ? 'Manage your family space.' : 'Your family space.'}
          </h1>
          {!isOwner && (
            <p className="settings-card-text">
              Only owners can invite, add, or remove members.
            </p>
          )}
        </div>
        {isOwner && (
          <div className="manage-page__actions">
            <button type="button" className="btn-outline" onClick={() => setModal({ kind: 'add-member' })}>
              + Add member
            </button>
            <button type="button" className="btn-primary" onClick={() => setModal({ kind: 'invite' })}>
              + Invite member
            </button>
          </div>
        )}
      </div>

      <h2 className="manage-page__h2">Members ({members.length})</h2>
      {members.length === 0 ? (
        <div className="empty-card">
          <p className="empty-card__text">No family members yet.</p>
          <p className="empty-card__sub">Your family space is invite-only. Invite the people you want to include.</p>
        </div>
      ) : (
        <ul className="manage-list">
          {members.map(m => (
            <li key={m.member_id} className="manage-list__row">
              <span className="manage-list__avatar" style={{ background: (m.tone || '#a39376') + '28', color: m.tone || '#556b5b' }}>
                {m.initials || m.name?.charAt(0) || '?'}
              </span>
              <div className="manage-list__body">
                <p className="manage-list__name">{m.name}{m.is_me ? ' · You' : ''}</p>
                <p className="manage-list__sub">
                  {m.role_label || m.kin_term || ''}
                  {m.deceased ? ' · Passed' : ''}
                </p>
              </div>
              <div className="manage-list__row-actions">
                <Link href={`/family/${m.member_id}`} className="manage-list__link">View</Link>
                {isOwner && (
                  <button
                    type="button"
                    className="manage-list__icon-btn"
                    onClick={() => setModal({ kind: 'edit-member', member: m })}
                    aria-label="Edit member"
                    title="Edit"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z"/></svg>
                  </button>
                )}
                {isOwner && !m.is_me && (
                  <button
                    type="button"
                    className="manage-list__icon-btn manage-list__icon-btn--danger"
                    onClick={() => setModal({ kind: 'remove-member', member: m })}
                    aria-label="Remove member"
                    title="Remove"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {pending.length > 0 && (
        <>
          <h2 className="manage-page__h2 manage-page__h2--spaced">Pending invitations ({pending.length})</h2>
          <ul className="manage-list">
            {pending.map(inv => (
              <li key={inv.ulid} className="manage-list__row">
                <span className="manage-list__avatar manage-list__avatar--pending">@</span>
                <div className="manage-list__body">
                  <p className="manage-list__name">{inv.email}</p>
                  <p className="manage-list__sub">
                    {inv.role_label || 'Invited'}
                    {inv.invited_at ? ` · sent ${inv.invited_at}` : ''}
                  </p>
                </div>
                {isOwner && (
                  <div className="manage-list__row-actions">
                    <button
                      type="button"
                      className="manage-list__icon-btn manage-list__icon-btn--danger"
                      onClick={() => setModal({ kind: 'revoke-invite', invitation: inv })}
                      aria-label="Revoke invitation"
                      title="Revoke"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {modal?.kind === 'invite' && (
        <InviteModal familySpaceId={familySpaceId} onClose={close} onDone={refresh} />
      )}
      {modal?.kind === 'add-member' && (
        <MemberFormModal
          mode="add"
          familySpaceId={familySpaceId}
          onClose={close}
          onDone={async () => { close(); await refresh(); }}
        />
      )}
      {modal?.kind === 'edit-member' && (
        <MemberFormModal
          mode="edit"
          familySpaceId={familySpaceId}
          member={modal.member}
          onClose={close}
          onDone={async () => { close(); await refresh(); }}
        />
      )}
      {modal?.kind === 'remove-member' && (
        <ConfirmModal
          title={`Remove ${modal.member.name}?`}
          text="Their kinlooms remain in the library, but they will no longer be part of this family space."
          confirmLabel="Remove"
          danger
          onCancel={close}
          onConfirm={async () => {
            await deleteMember(familySpaceId, modal.member.member_id);
            close();
            await refresh();
          }}
        />
      )}
      {modal?.kind === 'revoke-invite' && (
        <ConfirmModal
          title="Revoke invitation?"
          text={`The invite link sent to ${modal.invitation.email} will stop working.`}
          confirmLabel="Revoke"
          danger
          onCancel={close}
          onConfirm={async () => {
            await revokeInvitation(familySpaceId, modal.invitation.ulid);
            close();
            await refresh();
          }}
        />
      )}
    </>
  );
}

// ─── Invite modal ───────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Force a fresh Firebase ID token and push it to the BFF session cookie so
 * the next proxied call carries a valid Bearer. The browser normally never
 * touches the token (the /api/proxy BFF attaches it), but on a hard 401 we
 * rotate it here to satisfy the "fresh getIdToken(true) + single retry"
 * contract. Returns false when there's no signed-in Firebase user, meaning a
 * genuine re-login is required.
 */
async function refreshSessionToken(): Promise<boolean> {
  try {
    const user = firebaseAuth().currentUser;
    if (!user) return false;
    const fresh = await user.getIdToken(/* forceRefresh */ true);
    await syncSessionRefresh(fresh);
    return true;
  } catch {
    return false;
  }
}

/**
 * Map a create-invitation failure to a message shown inline in the modal.
 * Backend business errors use `{ error: "..." }`; Laravel validation uses
 * `{ message, errors }`.
 */
function invitationErrorMessage(err: unknown): string {
  if (!(err instanceof ApiError)) {
    return 'Couldn’t send the invitation. Please try again.';
  }
  const body = err.body as { error?: unknown } | null;
  const serverMsg =
    err.firstFieldError() ||
    (body && typeof body === 'object' && typeof body.error === 'string'
      ? body.error
      : undefined);

  switch (err.status) {
    case 422:
      return serverMsg || 'That person is already a member or has a pending invite.';
    case 429:
      return 'You’re sending invites too quickly — give it a moment and try again.';
    case 403:
      return 'Only the family space owner can invite members.';
    case 401:
      return 'Your session has expired. Please sign in again.';
    default:
      return 'Couldn’t send the invitation. Please try again.';
  }
}

function InviteModal({
  familySpaceId,
  onClose,
  onDone,
}: {
  familySpaceId: string;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InviteRole>('member');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Client-side validation first — non-empty and email-shaped — so we never
    // flash the sending state or hit the network for an obviously bad address.
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Enter an email address.');
      return;
    }
    if (!EMAIL_RE.test(trimmed)) {
      setError('Enter a valid email address.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      let res: CreateInvitationResponse;
      try {
        res = await createInvitation(familySpaceId, { email: trimmed, role });
      } catch (err) {
        // Token expired mid-flight: rotate the Firebase ID token, re-sync the
        // BFF session cookie, and retry exactly once before giving up.
        if (err instanceof ApiError && err.status === 401 && (await refreshSessionToken())) {
          res = await createInvitation(familySpaceId, { email: trimmed, role });
        } else {
          throw err;
        }
      }
      // The raw invite_token is a one-time reveal — this is the only place the
      // frontend ever sees it. Build the share link from the current origin.
      const url = typeof window !== 'undefined'
        ? `${window.location.origin}/invite/${encodeURIComponent(res.invite_token)}`
        : `/invite/${encodeURIComponent(res.invite_token)}`;
      setLink(url);
      // Refresh the Pending invitations list so the new invite appears.
      await onDone();
    } catch (err) {
      setError(invitationErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={e => { if (e.target === e.currentTarget && !submitting) onClose(); }}
    >
      <form className="modal" onSubmit={onSubmit}>
        <h3 className="modal-title">Invite a family member</h3>
        <p className="modal-text">They&apos;ll get an invite link to join this family space.</p>

        {!link ? (
          <div className="settings-fields">
            <div>
              <label className="field-label" htmlFor="invite-email">Email</label>
              <input
                id="invite-email"
                type="email"
                className="field-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={submitting}
              />
            </div>
            <div>
              <p className="field-label">Role</p>
              <div className="vis-row">
                {(['member', 'owner'] as InviteRole[]).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`vis-chip${role === r ? ' is-active' : ''}`}
                    disabled={submitting}
                  >
                    {r === 'owner' ? 'Owner' : 'Member'}
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="form-status form-status--error">{error}</p>}
          </div>
        ) : (
          <div className="settings-fields">
            <p className="form-status form-status--ok">Invitation sent.</p>
            <p className="modal-text">Share this link directly if needed:</p>
            <div className="invite-link">{link}</div>
            <div className="invite-link__row">
              <button type="button" className="btn-outline" onClick={copyLink}>
                {copied ? 'Copied!' : 'Copy link'}
              </button>
            </div>
          </div>
        )}

        <div className="modal-actions">
          {!link ? (
            <>
              <button type="button" className="btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
              <button type="submit" className="btn-save" disabled={submitting || !email.trim()}>
                {submitting ? 'Sending…' : 'Send invitation'}
              </button>
            </>
          ) : (
            <button type="button" className="btn-save" onClick={onClose}>Done</button>
          )}
        </div>
      </form>
    </div>
  );
}

// ─── Add / edit member modal ───────────────────────────────────────

function MemberFormModal({
  mode,
  familySpaceId,
  member,
  onClose,
  onDone,
}: {
  mode: 'add' | 'edit';
  familySpaceId: string;
  member?: FamilyMember;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [name, setName] = useState(member?.name ?? '');
  const [roleLabel, setRoleLabel] = useState(member?.role_label ?? '');
  const [gender, setGender] = useState<Gender>((member?.gender as Gender) || 'n');
  const [birthYear, setBirthYear] = useState<string>(member?.birth_year ? String(member.birth_year) : '');
  const [isDeceased, setIsDeceased] = useState<boolean>(!!member?.deceased);
  const [description, setDescription] = useState<string>(member?.description ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const yr = birthYear.trim() ? Number(birthYear) : null;
      if (mode === 'add') {
        await createMember(familySpaceId, {
          name: name.trim(),
          role_label: roleLabel.trim() || null,
          gender,
          birth_year: yr,
          is_deceased: isDeceased,
          description: description.trim() || null,
        });
      } else if (member) {
        await updateMember(familySpaceId, member.member_id, {
          name: name.trim(),
          role_label: roleLabel.trim() || null,
          gender,
          birth_year: yr,
          is_deceased: isDeceased,
          description: description.trim() || null,
        });
      }
      await onDone();
    } catch (err) {
      const msg = err instanceof ApiError
        ? (err.firstFieldError() || err.message)
        : 'Could not save.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={e => { if (e.target === e.currentTarget && !submitting) onClose(); }}
    >
      <form className="modal modal--wide" onSubmit={onSubmit}>
        <h3 className="modal-title">{mode === 'add' ? 'Add a family member' : `Edit ${member?.name}`}</h3>
        <p className="modal-text">
          {mode === 'add'
            ? 'Add someone (living or passed) to your family tree. Invite them separately if they should be able to log in.'
            : 'Update what we know about this family member.'}
        </p>

        <div className="settings-fields">
          <div>
            <label className="field-label" htmlFor="m-name">Name</label>
            <input
              id="m-name"
              className="field-input"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={120}
              required
              disabled={submitting}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="m-role">Role / kin term (optional)</label>
            <input
              id="m-role"
              className="field-input"
              value={roleLabel}
              onChange={e => setRoleLabel(e.target.value)}
              maxLength={80}
              placeholder="Mother, Grandfather, Cousin…"
              disabled={submitting}
            />
          </div>
          <div>
            <p className="field-label">Gender</p>
            <div className="vis-row">
              {([
                { id: 'f', label: 'Woman' },
                { id: 'm', label: 'Man' },
                { id: 'n', label: 'Non-binary' },
              ] as { id: Gender; label: string }[]).map(g => (
                <button
                  key={g.id}
                  type="button"
                  className={`vis-chip${gender === g.id ? ' is-active' : ''}`}
                  onClick={() => setGender(g.id)}
                  disabled={submitting}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="field-label" htmlFor="m-birth">Birth year (optional)</label>
            <input
              id="m-birth"
              className="field-input"
              value={birthYear}
              onChange={e => setBirthYear(e.target.value.replace(/[^0-9]/g, ''))}
              inputMode="numeric"
              maxLength={4}
              placeholder="1953"
              disabled={submitting}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="m-desc">A few words about them (optional)</label>
            <textarea
              id="m-desc"
              className="field-input field-input--textarea"
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={5000}
              rows={4}
              disabled={submitting}
            />
          </div>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={isDeceased}
              onChange={e => setIsDeceased(e.target.checked)}
              disabled={submitting}
            />
            <span>Has passed away</span>
          </label>

          {error && <p className="form-status form-status--error">{error}</p>}
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="btn-save" disabled={submitting}>
            {submitting ? 'Saving…' : mode === 'add' ? 'Add member' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Generic confirm modal ─────────────────────────────────────────

function ConfirmModal({
  title,
  text,
  confirmLabel,
  danger,
  onCancel,
  onConfirm,
}: {
  title: string;
  text: string;
  confirmLabel: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setError(null);
    setSubmitting(true);
    try {
      await onConfirm();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Something went wrong.';
      setError(msg);
      setSubmitting(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={e => { if (e.target === e.currentTarget && !submitting) onCancel(); }}
    >
      <div className="modal">
        <h3 className="modal-title">{title}</h3>
        <p className="modal-text">{text}</p>
        {error && <p className="form-status form-status--error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn-outline" onClick={onCancel} disabled={submitting}>Cancel</button>
          <button
            type="button"
            className={danger ? 'btn-danger-solid' : 'btn-save'}
            onClick={go}
            disabled={submitting}
          >
            {submitting ? '…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
