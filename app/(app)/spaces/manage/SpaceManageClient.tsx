'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '../../../../lib/api';
import { useAuth } from '../../../../lib/auth-context';
import {
  approveSpaceHome,
  cancelSpaceInvitation,
  inviteHomeToSpace,
  leaveSpace,
  removeSpaceHome,
  setSpaceLineage,
  setSpaceSuccessor,
  transferSpace,
  type PersonCard,
  type SpaceHome,
  type SpaceInvitation,
  type SpaceManage,
  type SpacePendingHome,
} from '../../../../lib/space-manage';

type Props = {
  spaceId: string;
  manage: SpaceManage;
};

type Modal =
  | { kind: 'invite' }
  | { kind: 'lineage'; home: SpaceHome }
  | { kind: 'approve'; pending: SpacePendingHome }
  | { kind: 'remove'; home: SpaceHome }
  | { kind: 'decline'; pending: SpacePendingHome }
  | { kind: 'revoke'; invitation: SpaceInvitation }
  | { kind: 'transfer' }
  | { kind: 'successor' }
  | { kind: 'leave' }
  | null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

const REASON: Record<SpacePendingHome['reason'], string> = {
  merge: 'Offered after someone merged into this Home.',
  leave: 'A new Home of their own, after someone left one of this Space’s Homes.',
  removed: 'A new Home of their own, after a Home in this Space removed them. Approving it lets them see this Space’s people again.',
};

/** Error code from the API's `{ error, message }` body, when it sends one. */
function errorCode(err: ApiError): string | undefined {
  const body = err.body as { error?: unknown } | null;
  return body && typeof body === 'object' && typeof body.error === 'string' ? body.error : undefined;
}

function plainError(err: unknown, fallback: string): string {
  if (!(err instanceof ApiError)) return fallback;
  const code = errorCode(err);
  if (code === 'transfer_ownership_first') {
    return 'This is the Home the Space’s owner is in. Transfer the Space to someone else first.';
  }
  if (code === 'space_full') return 'This Family Space has no free Home slots left.';
  if (code === 'already_member') return 'That Home is already in the Space.';
  if (err.status === 403) return 'Only the Space’s owner can do that.';
  if (err.status === 404) return 'That is no longer in this Space. Reload the page and try again.';
  if (err.status === 410) return 'That invitation was already accepted. Remove the Home instead.';
  if (err.status === 423) return 'This Family Space is read-only right now, so it can’t be changed.';
  if (err.status === 429) return 'You’re going too fast. Give it a moment and try again.';
  if (err.status === 401) return 'Your session has expired. Please sign in again.';
  return err.firstFieldError() || err.message || fallback;
}

export default function SpaceManageClient({ spaceId, manage }: Props) {
  const router = useRouter();
  const { refresh: refreshAuth } = useAuth();
  const [modal, setModal] = useState<Modal>(null);
  const { space, homes, pending, invitations, successor } = manage;
  const canEdit = space.viewer.can_edit;

  const close = () => setModal(null);
  const refresh = async () => {
    router.refresh();
  };
  // Ownership and membership change what /me says about this person's Spaces.
  const refreshSpaces = async () => {
    await refreshAuth();
    router.refresh();
  };

  const accounts = homes.flatMap(h => h.accounts);
  const ownerId = space.owner?.id ?? null;
  const nominees = accounts.filter(a => !a.deceased && a.id !== ownerId);

  return (
    <>
      <div className="mg-card">
        <div className="mg-card__head">
          <span className="mg-card__title">Family Homes in this Space ({homes.length})</span>
          <span className="mg-card__spacer" />
          {canEdit && (
            <button type="button" className="mg-card__action" onClick={() => setModal({ kind: 'invite' })}>
              + Invite a Family Home
            </button>
          )}
        </div>

        {homes.map(h => (
          <div key={h.id} className="mg-row">
            <div className="mg-row__body">
              <p className="mg-row__name mg-row__name--home">
                {h.name}{h.is_your_home ? ' · Your home' : ''}
              </p>
              <p className="mg-row__sub">
                {h.members} {h.members === 1 ? 'person' : 'people'}
                {` · joined ${shortDate(h.joined_at)}`}
                {' · '}
                {h.parents.length > 0
                  ? `From ${h.parents.map(p => p.name).join(' and ')}`
                  : h.placed
                    ? 'Where a line begins'
                    : 'Not on the tree yet'}
              </p>
            </div>
            {(canEdit || h.can_remove) && (
              <div className="mg-row__actions">
                {canEdit && (
                  <button type="button" className="mg-btn" onClick={() => setModal({ kind: 'lineage', home: h })}>
                    {h.placed ? 'Edit lineage' : 'Place in tree'}
                  </button>
                )}
                {h.can_remove && (
                  <button type="button" className="mg-btn mg-btn--danger" onClick={() => setModal({ kind: 'remove', home: h })}>
                    Remove
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {pending && pending.length > 0 && (
        <div className="mg-card mg-card--spaced">
          <div className="mg-card__head">
            <span className="mg-card__title">Waiting for your approval ({pending.length})</span>
          </div>
          {pending.map(p => (
            <div key={p.id} className="mg-row">
              <div className="mg-row__body">
                <p className="mg-row__name mg-row__name--home">{p.name}</p>
                <p className="mg-row__sub">
                  {REASON[p.reason]}
                  {p.initiated_by && ` · ${p.initiated_by.name}`}
                  {` · asked ${shortDate(p.requested_at)}`}
                </p>
              </div>
              <div className="mg-row__actions">
                <button type="button" className="mg-btn" onClick={() => setModal({ kind: 'approve', pending: p })}>
                  Approve
                </button>
                <button type="button" className="mg-btn mg-btn--danger" onClick={() => setModal({ kind: 'decline', pending: p })}>
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {invitations && invitations.length > 0 && (
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
                  {`Sent ${shortDate(inv.created_at)} · expires ${shortDate(inv.expires_at)}`}
                </p>
              </div>
              {canEdit && (
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

      <div className="mg-card mg-card--spaced">
        <div className="mg-card__head">
          <span className="mg-card__title">Who looks after this Space</span>
        </div>
        <div className="mg-row">
          <div className="mg-row__body">
            <p className="mg-row__name">
              {space.owner ? `${space.owner.name}${space.owner.is_you ? ' · You' : ''}` : 'No owner'}
            </p>
            <p className="mg-row__sub">Owner</p>
          </div>
          {canEdit && nominees.length > 0 && (
            <div className="mg-row__actions">
              <button type="button" className="mg-btn" onClick={() => setModal({ kind: 'transfer' })}>
                Transfer ownership
              </button>
            </div>
          )}
        </div>
        <div className="mg-row">
          <div className="mg-row__body">
            <p className="mg-row__name">{successor ? `${successor.name}${successor.is_you ? ' · You' : ''}` : 'Nobody yet'}</p>
            <p className="mg-row__sub">
              Successor. Takes the Space over if its owner goes
              {successor ? '.' : '; with none, the Space becomes read-only.'}
            </p>
          </div>
          {canEdit && nominees.length > 0 && (
            <div className="mg-row__actions">
              <button type="button" className="mg-btn" onClick={() => setModal({ kind: 'successor' })}>
                {successor ? 'Change' : 'Name one'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mg-card mg-card--spaced mg-leave">
        <div className="mg-card__head">
          <span className="mg-card__title">Leave this Family Space</span>
        </div>
        {space.viewer.can_leave ? (
          <div className="mg-leave__body">
            <p className="mg-leave__text">
              Your whole Family Home leaves. What your home’s people published here is taken back; every
              Vault, kinloom and comment stays.
            </p>
            <button type="button" className="mg-btn mg-btn--danger" onClick={() => setModal({ kind: 'leave' })}>
              Leave Space
            </button>
          </div>
        ) : (
          <p className="mg-card__empty">
            {space.viewer.role === 'owner'
              ? 'You own this Space, so your home can’t leave until someone else takes it over.'
              : 'Only the owner or co-owner of your Family Home can take it out of a Space.'}
          </p>
        )}
      </div>

      {modal?.kind === 'invite' && (
        <InviteModal spaceId={spaceId} slots={space.home_slots} onClose={close} onDone={refresh} />
      )}
      {modal?.kind === 'lineage' && (
        <ParentsModal
          title={`Where ${modal.home.name} sits`}
          text="Pick the Home or Homes it comes from: two for a marriage that joins two lines, none to leave it off the tree. This is only a picture; it never changes who can read what."
          confirmLabel="Save"
          options={homes.filter(h => h.id !== modal.home.id)}
          initial={modal.home.parents.map(p => p.id)}
          onCancel={close}
          onSubmit={async parents => {
            await setSpaceLineage(spaceId, modal.home.id, parents);
            close();
            await refresh();
          }}
        />
      )}
      {modal?.kind === 'approve' && (
        <ParentsModal
          title={`Approve ${modal.pending.name}?`}
          text="It joins the Space and its people can read what Homes publish here. You can place it on the tree now, or leave that for later."
          confirmLabel="Approve"
          options={homes}
          initial={[]}
          onCancel={close}
          onSubmit={async parents => {
            await approveSpaceHome(spaceId, modal.pending.id, parents);
            close();
            await refresh();
          }}
        />
      )}
      {modal?.kind === 'remove' && (
        <ConfirmModal
          title={`Remove ${modal.home.name}?`}
          text="What its people published to this Space is taken back, and they stop seeing the Space. Their Vaults, kinlooms and other rooms are untouched. Homes under it lose it as a parent."
          confirmLabel="Remove"
          danger
          onCancel={close}
          onConfirm={async () => {
            await removeSpaceHome(spaceId, modal.home.id);
            close();
            await refresh();
          }}
        />
      )}
      {modal?.kind === 'decline' && (
        <ConfirmModal
          title={`Decline ${modal.pending.name}?`}
          text="The offer is deleted and nothing else changes. They can be invited again."
          confirmLabel="Decline"
          danger
          onCancel={close}
          onConfirm={async () => {
            await removeSpaceHome(spaceId, modal.pending.id);
            close();
            await refresh();
          }}
        />
      )}
      {modal?.kind === 'revoke' && (
        <ConfirmModal
          title="Revoke invitation?"
          text={`The invite link sent to ${modal.invitation.email} will stop working.`}
          confirmLabel="Revoke"
          danger
          onCancel={close}
          onConfirm={async () => {
            await cancelSpaceInvitation(spaceId, modal.invitation.id);
            close();
            await refresh();
          }}
        />
      )}
      {modal?.kind === 'transfer' && (
        <PersonModal
          title="Transfer this Space"
          text="Choose who owns it next. You stay in the Space as a member. Only the new owner can hand it back."
          confirmLabel="Transfer ownership"
          danger
          people={nominees}
          onCancel={close}
          onSubmit={async id => {
            if (!id) throw new Error('Choose a person.');
            await transferSpace(spaceId, id);
            close();
            await refreshSpaces();
          }}
        />
      )}
      {modal?.kind === 'successor' && (
        <PersonModal
          title="Name a successor"
          text="They take the Space over if you can no longer own it. With none, it becomes read-only."
          confirmLabel="Save"
          allowNone
          initial={successor?.id ?? ''}
          people={nominees}
          onCancel={close}
          onSubmit={async id => {
            await setSpaceSuccessor(spaceId, id || null);
            close();
            await refresh();
          }}
        />
      )}
      {modal?.kind === 'leave' && (
        <ConfirmModal
          title={`Leave ${space.name}?`}
          text="Your whole Family Home leaves. What your home’s people published here is taken back, and you stop seeing this Space and its other Homes. Every Vault and kinloom stays as it is."
          confirmLabel="Leave Space"
          danger
          onCancel={close}
          onConfirm={async () => {
            await leaveSpace(spaceId);
            close();
            await refreshAuth();
            router.replace('/spaces');
            router.refresh();
          }}
        />
      )}
    </>
  );
}

// ─── Invite ─────────────────────────────────────────────────────────

function InviteModal({
  spaceId,
  slots,
  onClose,
  onDone,
}: {
  spaceId: string;
  slots: { used: number; max: number };
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) { setError('Enter an email address.'); return; }
    if (!EMAIL_RE.test(trimmed)) { setError('Enter a valid email address.'); return; }
    setError(null);
    setSubmitting(true);
    try {
      const res = await inviteHomeToSpace(spaceId, trimmed);
      // invite_token appears only in this response; build the share link now.
      setLink(`${window.location.origin}/invite/${encodeURIComponent(res.invite_token)}`);
      await onDone();
    } catch (err) {
      setError(plainError(err, 'Couldn’t send the invitation. Please try again.'));
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
      // The link is on screen to select by hand.
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget && !submitting) onClose(); }}>
      <form className="modal" onSubmit={onSubmit}>
        <h3 className="modal-title">Invite a Family Home</h3>
        <p className="modal-text">
          We’ll email a link to the person. When they accept, their whole Family Home joins this Space.
          {' '}{slots.used} of {slots.max} Home slots used.
        </p>
        {!link ? (
          <div className="settings-fields">
            <div>
              <label className="field-label" htmlFor="space-invite-email">Email</label>
              <input
                id="space-invite-email"
                type="email"
                className="field-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={submitting}
              />
            </div>
            {error && <p className="form-status form-status--error">{error}</p>}
          </div>
        ) : (
          <div className="settings-fields">
            <p className="form-status form-status--ok">Invitation sent to {email.trim()}.</p>
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
          <button type="button" className="btn-outline" onClick={onClose} disabled={submitting}>
            {link ? 'Done' : 'Cancel'}
          </button>
          {!link && (
            <button type="submit" className="btn-save" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send invitation'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

// ─── Lineage ────────────────────────────────────────────────────────

/** Up to two parent Homes, as toggles. Used to place a Home and to approve one. */
function ParentsModal({
  title,
  text,
  confirmLabel,
  options,
  initial,
  onCancel,
  onSubmit,
}: {
  title: string;
  text: string;
  confirmLabel: string;
  options: { id: string; name: string }[];
  initial: string[];
  onCancel: () => void;
  onSubmit: (parents: string[]) => Promise<void>;
}) {
  const [parents, setParents] = useState<string[]>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: string) =>
    setParents(p => (p.includes(id) ? p.filter(x => x !== id) : p.length >= 2 ? p : [...p, id]));

  async function go(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(parents);
    } catch (err) {
      setError(lineageError(err));
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget && !submitting) onCancel(); }}>
      <form className="modal" onSubmit={go}>
        <h3 className="modal-title">{title}</h3>
        <p className="modal-text">{text}</p>
        <div className="settings-fields">
          {options.length === 0 ? (
            <p className="modal-text">There is no other Home in this Space yet, so it starts a line of its own.</p>
          ) : (
            <>
              <p className="field-label">Comes from (up to two)</p>
              {options.map(o => {
                const on = parents.includes(o.id);
                return (
                  <label key={o.id} className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(o.id)}
                      disabled={submitting || (!on && parents.length >= 2)}
                    />
                    <span>{o.name}</span>
                  </label>
                );
              })}
            </>
          )}
          {error && <p className="form-status form-status--error">{error}</p>}
        </div>
        <div className="modal-actions">
          <button type="button" className="btn-outline" onClick={onCancel} disabled={submitting}>Cancel</button>
          <button type="submit" className="btn-save" disabled={submitting}>
            {submitting ? '…' : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

function lineageError(err: unknown): string {
  if (err instanceof ApiError && err.status === 422) {
    return err.firstFieldError() || 'That can’t be its parent: a Home can’t sit under itself or one of its own descendants.';
  }
  return plainError(err, 'Couldn’t save the lineage.');
}

// ─── Pick a person ──────────────────────────────────────────────────

function PersonModal({
  title,
  text,
  confirmLabel,
  danger,
  allowNone,
  initial = '',
  people,
  onCancel,
  onSubmit,
}: {
  title: string;
  text: string;
  confirmLabel: string;
  danger?: boolean;
  allowNone?: boolean;
  initial?: string;
  people: PersonCard[];
  onCancel: () => void;
  onSubmit: (id: string) => Promise<void>;
}) {
  const [id, setId] = useState(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(id);
    } catch (err) {
      setError(err instanceof Error && !(err instanceof ApiError) ? err.message : plainError(err, 'Something went wrong.'));
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget && !submitting) onCancel(); }}>
      <form className="modal" onSubmit={go}>
        <h3 className="modal-title">{title}</h3>
        <p className="modal-text">{text}</p>
        <div className="settings-fields">
          <label className="field-label" htmlFor="space-person">Person</label>
          <select
            id="space-person"
            className="field-input"
            value={id}
            onChange={e => setId(e.target.value)}
            disabled={submitting}
          >
            {allowNone ? <option value="">Nobody</option> : <option value="" disabled>Choose someone…</option>}
            {people.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {error && <p className="form-status form-status--error">{error}</p>}
        </div>
        <div className="modal-actions">
          <button type="button" className="btn-outline" onClick={onCancel} disabled={submitting}>Cancel</button>
          <button type="submit" className={danger ? 'btn-danger-solid' : 'btn-save'} disabled={submitting || (!allowNone && !id)}>
            {submitting ? '…' : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Confirm ────────────────────────────────────────────────────────

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
      setError(plainError(err, 'Something went wrong.'));
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget && !submitting) onCancel(); }}>
      <div className="modal">
        <h3 className="modal-title">{title}</h3>
        <p className="modal-text">{text}</p>
        {error && <p className="form-status form-status--error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn-outline" onClick={onCancel} disabled={submitting}>Cancel</button>
          <button type="button" className={danger ? 'btn-danger-solid' : 'btn-save'} onClick={go} disabled={submitting}>
            {submitting ? '…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
