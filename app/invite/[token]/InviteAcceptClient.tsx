'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth-context';
import { ApiError } from '../../../lib/api';
import {
  acceptHomeOrSpaceInvitation,
  apiErrorCode,
  isInviteeTier,
  leaveHome,
  type InvitationAccepted,
  type InvitationPreview,
  type InvitationPreviewInvitee,
  type InvitationPublishItem,
} from '../../../lib/invitations';
import { revalidateAllData } from '../../actions';

export type DeadReason = 'used' | 'expired' | 'not_found' | 'unavailable';

/** One of the signed-in person's final kinlooms, for the picker. */
export type VaultChoice = { id: string; title: string; type: string; wasPublished: boolean };

type Props = {
  token: string;
  /** Null when the link is dead (see `dead`). */
  preview: InvitationPreview | null;
  dead: DeadReason | null;
  /** The Firebase session, if any. */
  session: { email: string | null; emailVerified: boolean } | null;
  vault: VaultChoice[];
};

const DEAD_COPY: Record<DeadReason, { title: string; text: string }> = {
  used: {
    title: 'This invitation has already been used.',
    text: 'If that was you, you’re all set. Otherwise ask for a new invitation.',
  },
  expired: {
    title: 'This invitation has expired.',
    text: 'Invitations last 72 hours. Ask your family member to send a new one.',
  },
  not_found: {
    title: 'This invitation isn’t valid anymore.',
    text: 'It may have been cancelled or replaced. Ask your family member to send a new invitation.',
  },
  unavailable: {
    title: 'We couldn’t check this invitation.',
    text: 'Please try again in a moment.',
  },
};

/** The sentence under the title: what the link offers. */
function offer(preview: InvitationPreview): string {
  return preview.kind === 'space'
    ? `${preview.inviter_name} invited your Family Home to connect to ${preview.container_name}.`
    : `${preview.inviter_name} invited you to join ${preview.container_name}.`;
}

function acceptError(err: unknown): { text: string; dead?: DeadReason; leaveFirst?: boolean; verify?: boolean } {
  if (!(err instanceof ApiError)) return { text: 'Could not accept this invitation.' };
  const code = apiErrorCode(err);
  if (err.status === 410) return { text: '', dead: code === 'invitation_expired' ? 'expired' : 'used' };
  if (err.status === 404) return { text: '', dead: 'not_found' };
  if (code === 'email_unverified') return { text: 'Verify your email first, then accept.', verify: true };
  if (code === 'invitation_email_mismatch') {
    return { text: 'This invitation was sent to a different email address than the one you’re signed in with.' };
  }
  if (code === 'leave_current_home_first') return { text: err.message, leaveFirst: true };
  if (err.status === 429) {
    const wait = err.retryAfterSeconds;
    return { text: wait ? `Too many attempts. Try again in ${Math.ceil(wait / 60)} min.` : 'Too many attempts. Try again shortly.' };
  }
  return { text: err.message || 'Could not accept this invitation.' };
}

export default function InviteAcceptClient({ token, preview, dead, session, vault }: Props) {
  const router = useRouter();
  const { user, refresh, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deadNow, setDeadNow] = useState<DeadReason | null>(dead);
  const [accepted, setAccepted] = useState<InvitationAccepted | null>(null);

  const next = encodeURIComponent(`/invite/${token}`);
  const goHome = () => router.replace('/home');

  // ─── Dead links ──────────────────────────────────────────────
  if (deadNow || !preview) {
    const copy = DEAD_COPY[deadNow ?? 'unavailable'];
    return (
      <div className="invite-page">
        <h1 className="invite-page__title">{copy.title}</h1>
        <p className="invite-page__lede">{copy.text}</p>
        <div className="vis-row vis-row--center">
          {deadNow === 'unavailable' ? (
            <button type="button" className="btn-save" onClick={() => router.refresh()}>Try again</button>
          ) : (
            <Link href={session ? '/home' : '/'} className="btn-save">{session ? 'Go to home' : 'Sign in'}</Link>
          )}
        </div>
      </div>
    );
  }

  // ─── Done ────────────────────────────────────────────────────
  if (accepted) {
    const connected = accepted.mode === 'connect';
    return (
      <div className="invite-page">
        <h1 className="invite-page__title">
          {connected ? `${preview.container_name} is connected.` : `Welcome to ${accepted.home.name}.`}
        </h1>
        <p className="invite-page__lede">
          {connected
            ? 'Your Family Home is now part of this Family Space. Each person chooses what to publish there.'
            : 'You’re part of this home now. Their kinlooms are waiting for you.'}
        </p>
        <div className="vis-row vis-row--center">
          <button type="button" className="btn-save" onClick={goHome}>Go to home</button>
        </div>
      </div>
    );
  }

  // ─── Signed out ──────────────────────────────────────────────
  if (!session) {
    return (
      <div className="invite-page">
        <h1 className="invite-page__title">You’ve been invited.</h1>
        <p className="invite-page__lede">
          {offer(preview)} Sign in, or create your account with the email this invitation was sent to.
        </p>
        <div className="vis-row vis-row--center">
          <Link href={`/?next=${next}`} className="btn-save">Sign in</Link>
          <Link href={`/signup?next=${next}`} className="btn-outline">Create account</Link>
        </div>
      </div>
    );
  }

  // ─── Signed in, email not verified yet ───────────────────────
  if (!session.emailVerified) {
    return (
      <div className="invite-page">
        <h1 className="invite-page__title">Verify your email to accept.</h1>
        <p className="invite-page__lede">
          {offer(preview)} We need to confirm {session.email ? <strong>{session.email}</strong> : 'your email'} before you can join.
        </p>
        <div className="vis-row vis-row--center">
          <Link href={`/verify-email?next=${next}`} className="btn-save">Verify my email</Link>
        </div>
      </div>
    );
  }

  // ─── Signed in, verified, but not the invited address ───────
  if (!isInviteeTier(preview)) {
    return (
      <div className="invite-page">
        <h1 className="invite-page__title">This invitation is for a different account.</h1>
        <p className="invite-page__lede">
          {offer(preview)} It was sent to another email address than <strong>{session.email}</strong>. Sign in with the address it was sent to.
        </p>
        <div className="vis-row vis-row--center">
          <button
            type="button"
            className="btn-save"
            onClick={async () => {
              await logout();
              router.replace(`/?next=${next}`);
            }}
          >
            Switch account
          </button>
          <Link href="/home" className="btn-outline">Not now</Link>
        </div>
      </div>
    );
  }

  return (
    <InviteePanel
      preview={preview}
      vault={vault}
      busy={busy}
      error={error}
      homeId={user?.home.id ?? null}
      onLeave={async () => {
        if (!user) return;
        setBusy(true);
        setError(null);
        try {
          await leaveHome(user.home.id);
          await refresh();
          router.refresh(); // new preview, computed from the new solo Home
        } catch (err) {
          setError(
            apiErrorCode(err) === 'transfer_ownership_first'
              ? 'You own this Home. Hand it to someone else first, in Manage Family.'
              : err instanceof ApiError ? err.message : 'Could not leave your Home.',
          );
        } finally {
          setBusy(false);
        }
      }}
      onAccept={async (publish) => {
        setBusy(true);
        setError(null);
        try {
          const res = await acceptHomeOrSpaceInvitation(token, publish);
          setAccepted(res);
          // Accepting changes what /me says: a new Home, Spaces, maybe a new person id.
          await refresh();
          void revalidateAllData();
        } catch (err) {
          const e = acceptError(err);
          if (e.dead) setDeadNow(e.dead);
          else {
            setError(e.text);
            if (e.leaveFirst) router.refresh();
          }
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}

function InviteePanel({
  preview,
  vault,
  busy,
  error,
  homeId,
  onLeave,
  onAccept,
}: {
  preview: InvitationPreviewInvitee;
  vault: VaultChoice[];
  busy: boolean;
  error: string | null;
  homeId: string | null;
  onLeave: () => void;
  onAccept: (publish: InvitationPublishItem[]) => void;
}) {
  const isHome = preview.kind === 'home';
  const rooms = preview.publish_targets;
  const [picked, setPicked] = useState<Set<string>>(
    () => new Set(vault.filter(v => v.wasPublished).map(v => v.id)),
  );
  // Default room: the inviting Home, which the API lists first.
  const [roomKeys, setRoomKeys] = useState<Set<string>>(
    () => new Set(rooms.length > 0 ? [`${rooms[0].type}:${rooms[0].id}`] : []),
  );

  const toggle = <T,>(set: Set<T>, v: T): Set<T> => {
    const n = new Set(set);
    if (n.has(v)) n.delete(v); else n.add(v);
    return n;
  };

  const publish: InvitationPublishItem[] = useMemo(() => {
    if (!isHome || roomKeys.size === 0) return [];
    const targets = rooms
      .filter(r => roomKeys.has(`${r.type}:${r.id}`))
      .map(r => ({ type: r.type, id: r.id, when: 'now' as const }));
    return Array.from(picked).map(kinloom_id => ({ kinloom_id, targets }));
  }, [isHome, rooms, roomKeys, picked]);

  // Cannot accept for a reason leaving your Home can't fix.
  if (!preview.can_accept) {
    return (
      <div className="invite-page">
        <h1 className="invite-page__title">You can’t accept this one.</h1>
        <p className="invite-page__lede">
          {preview.kind === 'space'
            ? 'Only the owner or co-owner of a Family Home can connect it to a Family Space, or your Home is already part of this one.'
            : 'You’re already part of this home.'}
        </p>
        <div className="vis-row vis-row--center">
          <Link href="/home" className="btn-save">Go to home</Link>
        </div>
      </div>
    );
  }

  // Another person lives in the current Home: leave it first.
  if (preview.requires_leave_first) {
    return (
      <div className="invite-page">
        <h1 className="invite-page__title">Leave your current Home first.</h1>
        <p className="invite-page__lede">
          {offer(preview)} Your Family Home has other people in it, so you need to leave it before you can join another.
        </p>
        <ul className="invite-page__notes">
          <li>You keep your Vault and everything you’ve written.</li>
          <li>What you published to your current Home is withdrawn. You can publish it again afterwards.</li>
          <li>You get a new Home of your own, and then you can join this one.</li>
        </ul>
        {error && <p className="form-status form-status--error">{error}</p>}
        <div className="vis-row vis-row--center">
          <button type="button" className="btn-save" onClick={onLeave} disabled={busy || !homeId}>
            {busy ? 'Leaving…' : 'Leave my Home'}
          </button>
          <Link href="/home" className="btn-outline">Not now</Link>
        </div>
      </div>
    );
  }

  const notes: string[] = [];
  if (preview.mode === 'claim' && preview.claim_profile) {
    const label = preview.claim_profile.label ? ` (${preview.claim_profile.label})` : '';
    notes.push(`You become ${preview.claim_profile.name}${label}, the profile ${preview.inviter_name} set up for you.`);
    notes.push('Your account takes that name.');
  }
  if (preview.mode === 'merge') {
    notes.push('Everything you published through your current Home is withdrawn. You can put it back below.');
    notes.push('Its family profiles move with you, and that Home is closed.');
  }
  if (preview.mode === 'join' || preview.mode === 'claim') {
    notes.push('Your current Home is just you, so it is closed when you move.');
  }
  if (preview.mode === 'connect') {
    notes.push('Your Home becomes part of this Family Space right away.');
    notes.push('Nothing is published for you. Each person chooses what to share there.');
  }

  const title = preview.mode === 'connect' ? 'Connect to this Family Space?' : 'Join this family?';

  return (
    <div className={`invite-page${isHome && vault.length > 0 ? ' invite-page--wide' : ''}`}>
      <h1 className="invite-page__title">{title}</h1>
      <p className="invite-page__lede">{offer(preview)}</p>
      {notes.length > 0 && (
        <ul className="invite-page__notes">
          {notes.map(n => <li key={n}>{n}</li>)}
        </ul>
      )}

      {isHome && vault.length > 0 && (
        <div className="invite-picker">
          <p className="invite-picker__title">Share what you’ve written</p>
          <p className="invite-picker__sub">
            Pick the kinlooms to publish once you’ve joined. Anything you leave out stays in your Vault, private.
          </p>
          {rooms.length > 1 && (
            <div className="invite-picker__rooms">
              {rooms.map(r => {
                const key = `${r.type}:${r.id}`;
                return (
                  <label key={key} className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={roomKeys.has(key)}
                      onChange={() => setRoomKeys(s => toggle(s, key))}
                    />
                    {r.name}
                  </label>
                );
              })}
            </div>
          )}
          <div className="invite-picker__list">
            {vault.map(v => (
              <label key={v.id} className="checkbox-row">
                <input type="checkbox" checked={picked.has(v.id)} onChange={() => setPicked(s => toggle(s, v.id))} />
                <span>
                  {v.title} <span className="invite-picker__type">· {v.type}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {error && <p className="form-status form-status--error">{error}</p>}
      <div className="vis-row vis-row--center">
        <button type="button" className="btn-save" onClick={() => onAccept(publish)} disabled={busy}>
          {busy ? 'Accepting…' : preview.mode === 'connect' ? 'Connect' : 'Accept invitation'}
        </button>
        <Link href="/home" className="btn-outline">Not now</Link>
      </div>
      <p className="invite-page__quiet">
        Link expires {new Date(preview.expires_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}.
      </p>
    </div>
  );
}
