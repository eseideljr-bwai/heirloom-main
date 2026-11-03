'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  addFamilyProfile,
  inviteToHome,
  removeHomeMember,
  revokeHomeInvitation,
  setHomeRoles,
  transferHomeOwnership,
  updateHomeMember,
  type HomeInvitation,
  type HomeInvitationCreated,
  type HomeManage,
  type HomeMember,
} from '../../../../lib/home-manage';
import { ApiError } from '../../../../lib/api';
import { useAuth } from '../../../../lib/auth-context';
import { firebaseAuth } from '../../../../lib/firebase-client';
import { syncSessionRefresh } from '../../../../lib/auth';
import { revalidateFamilyData } from '../../../actions';

type Gender = 'f' | 'm' | 'n';

type Props = {
  homeId: string;
  manage: HomeManage;
};

type Modal =
  | { kind: 'invite' }
  | { kind: 'add-profile' }
  | { kind: 'edit'; member: HomeMember }
  | { kind: 'remove'; member: HomeMember }
  | { kind: 'revoke'; invitation: HomeInvitation }
  | { kind: 'roles'; member: HomeMember }
  | { kind: 'transfer'; member: HomeMember }
  | null;

const ROLE_LABEL: Record<string, string> = {
  owner: 'Owner',
  co_owner: 'Co-owner',
  member: 'Member',
};

/** Error code from the API's `{ error, message }` body, when it sends one. */
function errorCode(err: ApiError): string | undefined {
  const body = err.body as { error?: unknown } | null;
  return body && typeof body === 'object' && typeof body.error === 'string' ? body.error : undefined;
}

function plainError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.status === 423) return 'This home is read-only right now, so it can’t be changed.';
    if (err.status === 429) return 'You’re going too fast. Give it a moment and try again.';
    return err.firstFieldError() || err.message || fallback;
  }
  return fallback;
}

function roleError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.status === 403) return 'Only the owner can change roles or hand the home over.';
    if (err.status === 404) return 'That person is no longer in this home. Reload the page and try again.';
    if (err.status === 422) return 'That person can’t take this role. It has to be someone with an account in this home.';
    return plainError(err, fallback);
  }
  return fallback;
}

/** Roles in the order the page shows them, for the people who can hold one. */
function canHoldRole(m: HomeMember): boolean {
  return m.has_account && m.role !== 'owner' && !m.deceased;
}

export default function ManageFamilyClient({ homeId, manage }: Props) {
  const router = useRouter();
  const { refresh: refreshAuth } = useAuth();
  const [modal, setModal] = useState<Modal>(null);
  const { viewer, people, invitations } = manage;

  const close = () => setModal(null);
  const refresh = async () => {
    await revalidateFamilyData();
    router.refresh();
  };

  // Roles and ownership change what /me says about this person's Home.
  const refreshRoles = async () => {
    await revalidateFamilyData();
    await refreshAuth();
    router.refresh();
  };

  const canAdd = viewer.can_add_profile;
  const canInvite = viewer.can_invite;

  return (
    <>
      <div className="mg-card">
        <div className="mg-card__head">
          <span className="mg-card__title">People ({people.length})</span>
          <span className="mg-card__spacer" />
          {canAdd && (
            <button type="button" className="mg-card__action" onClick={() => setModal({ kind: 'add-profile' })}>
              + Add family member
            </button>
          )}
          {canInvite && (
            <button type="button" className="mg-card__action" onClick={() => setModal({ kind: 'invite' })}>
              + Invite
            </button>
          )}
          {!canAdd && !canInvite && (
            <span className="mg-card__note">Only owners and co-owners can add or invite.</span>
          )}
        </div>

        {people.map(m => (
          <div key={m.id} className="mg-row">
            <span
              className="mg-row__avatar"
              style={{ background: `${m.tone || '#a39376'}28`, color: m.tone || '#556b5b' }}
              aria-hidden="true"
            >
              {m.initials || m.name?.charAt(0) || '?'}
            </span>
            <div className="mg-row__body">
              <p className="mg-row__name">{m.name}{m.is_you ? ' · You' : ''}</p>
              <p className="mg-row__sub">
                {[
                  m.relationship_label || (m.is_you ? null : m.label),
                  m.has_account
                    ? `${m.role ? ROLE_LABEL[m.role] ?? 'Member' : 'Member'}${m.is_successor ? ' · Successor' : ''}`
                    : 'No account',
                  m.deceased ? 'Passed' : null,
                ].filter(Boolean).join(' · ')}
              </p>
            </div>
            <div className="mg-row__actions">
              <Link href={`/portrait/${m.id}`} className="mg-btn">View</Link>
              {m.can_edit && (
                <button type="button" className="mg-btn" onClick={() => setModal({ kind: 'edit', member: m })}>
                  Edit
                </button>
              )}
              {viewer.can_set_roles && canHoldRole(m) && (
                <button type="button" className="mg-btn" onClick={() => setModal({ kind: 'roles', member: m })}>
                  Roles
                </button>
              )}
              {m.can_remove && (
                <button type="button" className="mg-btn mg-btn--danger" onClick={() => setModal({ kind: 'remove', member: m })}>
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {invitations.length > 0 && (
        <div className="mg-card mg-card--spaced">
          <div className="mg-card__head">
            <span className="mg-card__title">Pending invitations ({invitations.length})</span>
          </div>
          {invitations.map(inv => (
            <div key={inv.id} className="mg-row">
              <span className="mg-row__avatar mg-row__avatar--pending" aria-hidden="true">@</span>
              <div className="mg-row__body">
                <p className="mg-row__name">{inv.email}</p>
                <p className="mg-row__sub">
                  {inv.claim_profile ? `To take over ${inv.claim_profile.name}’s profile` : 'Invited'}
                  {` · sent ${new Date(inv.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
                  {` · expires ${new Date(inv.expires_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
                </p>
              </div>
              {canInvite && (
                <div className="mg-row__actions">
                  <button type="button" className="mg-btn mg-btn--danger" onClick={() => setModal({ kind: 'revoke', invitation: inv })}>
                    Revoke
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal?.kind === 'invite' && (
        <InviteModal homeId={homeId} manage={manage} onClose={close} onDone={refresh} />
      )}
      {modal?.kind === 'add-profile' && (
        <ProfileModal
          mode="add"
          homeId={homeId}
          onClose={close}
          onDone={async () => { close(); await refresh(); }}
        />
      )}
      {modal?.kind === 'edit' && (
        <ProfileModal
          mode="edit"
          homeId={homeId}
          member={modal.member}
          onClose={close}
          onDone={async () => { close(); await refresh(); }}
        />
      )}
      {modal?.kind === 'remove' && (
        <ConfirmModal
          title={`Remove ${modal.member.name}?`}
          text={
            modal.member.has_account
              ? 'They keep their Vault and everything they wrote, and move to a Family Home of their own. Whatever they published here is taken back, and they can no longer read this home.'
              : 'Their profile is deleted and they are removed from the tree. Kinlooms that mention them stay, without the tag.'
          }
          confirmLabel="Remove"
          danger
          onCancel={close}
          onConfirm={async () => {
            await removeHomeMember(homeId, modal.member.id);
            close();
            await refresh();
          }}
        />
      )}
      {modal?.kind === 'roles' && (
        <RolesModal
          homeId={homeId}
          member={modal.member}
          people={people}
          canTransfer={viewer.can_transfer}
          onClose={close}
          onDone={async () => { close(); await refreshRoles(); }}
          onTransfer={() => setModal({ kind: 'transfer', member: modal.member })}
        />
      )}
      {modal?.kind === 'transfer' && (
        <ConfirmModal
          title={`Make ${modal.member.name} the owner?`}
          text={transferText(modal.member, people)}
          confirmLabel="Transfer ownership"
          danger
          onCancel={close}
          onConfirm={async () => {
            try {
              await transferHomeOwnership(homeId, modal.member.id);
            } catch (err) {
              throw new Error(roleError(err, 'Couldn’t transfer ownership.'));
            }
            close();
            await refreshRoles();
          }}
        />
      )}
      {modal?.kind === 'revoke' && (
        <ConfirmModal
          title="Revoke invitation?"
          text={`The invite link sent to ${modal.invitation.email} will stop working, and the seat it holds is free again.`}
          confirmLabel="Revoke"
          danger
          onCancel={close}
          onConfirm={async () => {
            await revokeHomeInvitation(homeId, modal.invitation.id);
            close();
            await refresh();
          }}
        />
      )}
    </>
  );
}

// ─── Roles and ownership ────────────────────────────────────────────

/** What ownership changing hands means for the person handing it over. */
function transferText(newOwner: HomeMember, people: HomeMember[]): string {
  const coOwner = people.find(p => p.role === 'co_owner');
  const youBecome = !coOwner || coOwner.id === newOwner.id ? 'the co-owner' : 'a member';
  return (
    `${newOwner.name} becomes the owner of this home, and you become ${youBecome}. ` +
    'The home then runs on their plan: if they are on the Free plan, inviting people stops until they upgrade. ' +
    'Only they can transfer it back.'
  );
}

function RolesModal({
  homeId,
  member,
  people,
  canTransfer,
  onClose,
  onDone,
  onTransfer,
}: {
  homeId: string;
  member: HomeMember;
  people: HomeMember[];
  canTransfer: boolean;
  onClose: () => void;
  onDone: () => Promise<void>;
  onTransfer: () => void;
}) {
  const currentCoOwner = people.find(p => p.role === 'co_owner') ?? null;
  const currentSuccessor = people.find(p => p.is_successor) ?? null;

  const wasCoOwner = member.role === 'co_owner';
  const wasSuccessor = member.is_successor;
  const [coOwner, setCoOwner] = useState(wasCoOwner);
  const [successor, setSuccessor] = useState(wasSuccessor);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changed = coOwner !== wasCoOwner || successor !== wasSuccessor;
  const replacesCoOwner = coOwner && !wasCoOwner && currentCoOwner && currentCoOwner.id !== member.id;
  const replacesSuccessor = successor && !wasSuccessor && currentSuccessor && currentSuccessor.id !== member.id;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!changed) return;
    setError(null);
    setSubmitting(true);
    try {
      // The request replaces both roles, so send the pair as it should end up.
      await setHomeRoles(homeId, {
        co_owner_member_id: coOwner ? member.id : currentCoOwner?.id === member.id ? null : currentCoOwner?.id ?? null,
        successor_member_id: successor ? member.id : currentSuccessor?.id === member.id ? null : currentSuccessor?.id ?? null,
      });
      await onDone();
    } catch (err) {
      setError(roleError(err, 'Couldn’t save the roles.'));
      setSubmitting(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={e => { if (e.target === e.currentTarget && !submitting) onClose(); }}
    >
      <form className="modal" onSubmit={onSubmit}>
        <h3 className="modal-title">Roles for {member.name}</h3>
        <p className="modal-text">Only you, as the owner, can set these.</p>

        <div className="settings-fields">
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={coOwner}
              onChange={e => setCoOwner(e.target.checked)}
              disabled={submitting}
            />
            <span>
              Co-owner. Can edit the home, invite on your plan, manage family profiles and remove comments.
            </span>
          </label>
          {replacesCoOwner && currentCoOwner && (
            <p className="modal-text">{currentCoOwner.name} would become a member.</p>
          )}
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={successor}
              onChange={e => setSuccessor(e.target.checked)}
              disabled={submitting}
            />
            <span>
              Successor. Takes the home over if you leave the product, by deleting your account or being memorialized.
            </span>
          </label>
          {replacesSuccessor && currentSuccessor && (
            <p className="modal-text">{currentSuccessor.name} would no longer be the successor.</p>
          )}
          {error && <p className="form-status form-status--error">{error}</p>}
        </div>

        {canTransfer && (
          <p className="modal-text mg-modal__alt">
            <button type="button" className="mg-card__action" onClick={onTransfer} disabled={submitting}>
              Make {member.name} the owner instead…
            </button>
          </p>
        )}

        <div className="modal-actions">
          <button type="button" className="btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="btn-save" disabled={submitting || !changed}>
            {submitting ? 'Saving…' : 'Save roles'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Invite modal ───────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Force a fresh Firebase ID token and push it to the BFF session cookie so
 * the next proxied call carries a valid Bearer. Returns false when there's no
 * signed-in Firebase user, meaning a genuine re-login is required.
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

function invitationErrorMessage(err: unknown, manage: HomeManage): string {
  if (!(err instanceof ApiError)) return 'Couldn’t send the invitation. Please try again.';
  const code = errorCode(err);
  if (err.status === 402) {
    const body = err.body as { upgrade_by?: string } | null;
    return body?.upgrade_by === 'home_owner'
      ? 'Inviting people needs the Home plan, and it’s the owner’s plan that counts. Ask the owner to upgrade.'
      : 'Inviting people needs the Home plan. Upgrade your plan to invite someone to this home.';
  }
  if (err.status === 409 || code === 'seat_limit_reached') {
    return `All ${manage.seats.max} seats are taken, counting pending invitations. Revoke an invitation or remove someone to free one.`;
  }
  if (err.status === 403) return 'Only owners and co-owners can invite people.';
  if (err.status === 401) return 'Your session has expired. Please sign in again.';
  return plainError(err, 'Couldn’t send the invitation. Please try again.');
}

function InviteModal({
  homeId,
  manage,
  onClose,
  onDone,
}: {
  homeId: string;
  manage: HomeManage;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [claim, setClaim] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // A living family profile with no account can be handed to the invitee.
  const claimable = manage.people.filter(p => !p.has_account && !p.deceased);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) { setError('Enter an email address.'); return; }
    if (!EMAIL_RE.test(trimmed)) { setError('Enter a valid email address.'); return; }

    setError(null);
    setSubmitting(true);
    try {
      const body = { email: trimmed, claim_member_id: claim || null };
      let res: HomeInvitationCreated;
      try {
        res = await inviteToHome(homeId, body);
      } catch (err) {
        // Token expired mid-flight: rotate it and retry exactly once.
        if (err instanceof ApiError && err.status === 401 && (await refreshSessionToken())) {
          res = await inviteToHome(homeId, body);
        } else {
          throw err;
        }
      }
      // invite_token appears only in this response; build the share link now.
      const url = `${window.location.origin}/invite/${encodeURIComponent(res.invite_token)}`;
      setSentTo(trimmed);
      setLink(url);
      await onDone();
    } catch (err) {
      setError(invitationErrorMessage(err, manage));
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
        <h3 className="modal-title">Invite someone to your home</h3>
        <p className="modal-text">
          We&apos;ll email them a link to join. They&apos;ll be able to read everything published to this home.
          {' '}{manage.seats.used} of {manage.seats.max} seats used.
        </p>

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
            {claimable.length > 0 && (
              <div>
                <label className="field-label" htmlFor="invite-claim">Taking over a profile (optional)</label>
                <select
                  id="invite-claim"
                  className="field-input"
                  value={claim}
                  onChange={e => setClaim(e.target.value)}
                  disabled={submitting}
                >
                  <option value="">A new person</option>
                  {claimable.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
            {error && <p className="form-status form-status--error">{error}</p>}
          </div>
        ) : (
          <div className="settings-fields">
            <p className="form-status form-status--ok">
              Invitation email sent{sentTo ? ` to ${sentTo}` : ''}.
            </p>
            <p className="modal-text">You can also share this link directly:</p>
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

// ─── Add family profile / edit a person ─────────────────────────────

function ProfileModal({
  mode,
  homeId,
  member,
  onClose,
  onDone,
}: {
  mode: 'add' | 'edit';
  homeId: string;
  member?: HomeMember;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  // An account's name, gender, birth year and words are theirs to edit; the
  // Home only decides how it labels them.
  const labelOnly = mode === 'edit' && !!member?.has_account;

  const [name, setName] = useState(member?.name ?? '');
  const [label, setLabel] = useState(member?.relationship_label ?? '');
  const [gender, setGender] = useState<Gender>((member?.gender as Gender) || 'n');
  const [birthYear, setBirthYear] = useState<string>(member?.birth_year ? String(member.birth_year) : '');
  const [deceased, setDeceased] = useState<boolean>(!!member?.deceased);
  const [diedOn, setDiedOn] = useState<string>(member?.date_of_death ?? '');
  const [description, setDescription] = useState<string>(member?.description ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!labelOnly && !name.trim()) { setError('Name is required.'); return; }
    setError(null);
    setSubmitting(true);
    try {
      const relationship_label = label.trim() || null;
      if (labelOnly && member) {
        await updateHomeMember(homeId, member.id, { relationship_label });
      } else {
        const body = {
          name: name.trim(),
          relationship_label,
          gender,
          birth_year: birthYear.trim() ? Number(birthYear) : null,
          deceased,
          date_of_death: deceased && diedOn ? diedOn : null,
          description: description.trim() || null,
        };
        if (mode === 'add') await addFamilyProfile(homeId, body);
        else if (member) await updateHomeMember(homeId, member.id, body);
      }
      await onDone();
    } catch (err) {
      const code = err instanceof ApiError ? errorCode(err) : undefined;
      setError(
        code === 'profile_limit_reached'
          ? 'This home has reached its limit of 40 family profiles.'
          : plainError(err, 'Could not save.'),
      );
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
            ? 'Add someone without an account, such as a child or a relative who has passed. They can be tagged in kinlooms. Invite them separately if they should sign in.'
            : labelOnly
              ? 'This person keeps their own name and details. Here you set how this home labels them.'
              : 'Update what we know about this family member.'}
        </p>

        <div className="settings-fields">
          {!labelOnly && (
            <div>
              <label className="field-label" htmlFor="m-name">Name</label>
              <input
                id="m-name"
                className="field-input"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={255}
                required
                disabled={submitting}
              />
            </div>
          )}
          <div>
            <label className="field-label" htmlFor="m-role">How this home labels them (optional)</label>
            <input
              id="m-role"
              className="field-input"
              value={label}
              onChange={e => setLabel(e.target.value)}
              maxLength={64}
              placeholder="Mother, Grandfather, Cousin…"
              disabled={submitting}
            />
          </div>
          {!labelOnly && (
            <>
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
                  maxLength={2000}
                  rows={4}
                  disabled={submitting}
                />
              </div>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={deceased}
                  onChange={e => setDeceased(e.target.checked)}
                  disabled={submitting}
                />
                <span>Has passed away</span>
              </label>
              {deceased && (
                <div>
                  <label className="field-label" htmlFor="m-died">Date of passing (optional)</label>
                  <input
                    id="m-died"
                    type="date"
                    className="field-input"
                    value={diedOn}
                    onChange={e => setDiedOn(e.target.value)}
                    disabled={submitting}
                  />
                </div>
              )}
            </>
          )}

          {error && <p className="form-status form-status--error">{error}</p>}
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="btn-save" disabled={submitting}>
            {submitting ? 'Saving…' : mode === 'add' ? 'Add' : 'Save changes'}
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
      setError(err instanceof Error && !(err instanceof ApiError) ? err.message : plainError(err, 'Something went wrong.'));
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
