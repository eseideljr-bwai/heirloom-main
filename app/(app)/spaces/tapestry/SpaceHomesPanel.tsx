'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApiError } from '../../../../lib/api';
import { inviteHomeToSpace, type SpaceHome, type SpaceInvitation } from '../../../../lib/space-manage';

/** The letter for an avatar: "The Doyle Home" is a D, not a T. */
const initialOf = (text: string) => (text.trim().replace(/^the\s+/i, '').charAt(0) || '?').toUpperCase();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function inviteError(err: unknown): string {
  if (!(err instanceof ApiError)) return 'Couldn’t send the invitation. Please try again.';
  if (err.status === 409) return 'This Family Space is full.';
  if (err.status === 422) return err.firstFieldError() ?? 'That email wasn’t accepted.';
  if (err.status === 429) return 'Too many invitations sent today. Try again tomorrow.';
  return 'Couldn’t send the invitation. Please try again.';
}

/**
 * The Homes in a Space and who has been invited, with an invite box for its
 * owner. Shown beside the empty Tapestry of a Space nothing is published to
 * yet. It reads `GET …/manage`; the box is shown only when
 * `space.viewer.can_edit` says the person may invite.
 */
export default function SpaceHomesPanel({
  spaceId,
  homes,
  invitations,
  canInvite,
}: {
  spaceId: string;
  homes: SpaceHome[];
  /** Null for a member: only the owner sees who has been invited. */
  invitations: SpaceInvitation[] | null;
  canInvite: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invited = invitations ?? [];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!EMAIL_RE.test(value)) { setError('Enter an email address.'); return; }
    setBusy(true);
    setError(null);
    try {
      await inviteHomeToSpace(spaceId, value);
      setEmail('');
      router.refresh();
    } catch (err) {
      setError(inviteError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="sp-homes" aria-label="Homes in this Family Space">
      <div className="sp-homes__head">
        <p className="sp-homes__label">Homes</p>
        <p className="sp-homes__count">
          {homes.length} joined{invitations ? ` · ${invited.length} invited` : ''}
        </p>
      </div>

      <ul className="sp-homes__list">
        {homes.map(h => (
          <li key={h.id}>
            <span className="csw-avatar" aria-hidden="true">{initialOf(h.name)}</span>
            <span className="sp-homes__text">
              <span className="sp-homes__name">{h.name}</span>
              <span className="sp-homes__sub">{h.is_your_home ? 'Your home · owner' : 'Joined'}</span>
            </span>
          </li>
        ))}
        {invited.map(i => (
          <li key={i.id}>
            <span className="csw-avatar csw-avatar--invited" aria-hidden="true">
              {i.email.charAt(0).toUpperCase()}
            </span>
            <span className="sp-homes__text">
              <span className="sp-homes__name">{i.email}</span>
              <span className="sp-homes__sub">Invitation sent</span>
            </span>
          </li>
        ))}
      </ul>

      {canInvite && (
        <form className="sp-homes__invite" onSubmit={onSubmit} noValidate>
          <label className="sr-only" htmlFor="sp-invite-email">Invite a home by email</label>
          <input
            id="sp-invite-email"
            type="email"
            className="field-input"
            placeholder="Invite a home by email"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(null); }}
            disabled={busy}
            autoComplete="off"
          />
          <button type="submit" className="btn-save" disabled={busy || !email.trim()}>
            {busy ? 'Sending…' : 'Invite'}
          </button>
        </form>
      )}
      {error && <p className="form-status form-status--error" role="alert">{error}</p>}
      {canInvite && (
        <p className="sp-homes__note">
          Invited homes appear in the tree and the tapestry once their owner accepts.{' '}
          <Link href="/spaces/manage">Manage Space</Link>
        </p>
      )}
    </aside>
  );
}
