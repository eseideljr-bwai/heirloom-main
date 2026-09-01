'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth-context';
import { useActiveFamilySpace } from '../../../lib/active-family-space';
import { acceptInvitation } from '../../../lib/family';
import { ApiError } from '../../../lib/api';
import { revalidateAllData } from '../../actions';

export default function InviteAcceptClient({ token }: { token: string }) {
  const router = useRouter();
  const { user, loading, refresh, upsertFamilySpace } = useAuth();
  const { setActiveSpaceId } = useActiveFamilySpace();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A dead link (already used, expired, or invalid) can never succeed on
  // retry, so we swap the accept card for a terminal message instead.
  const [linkDead, setLinkDead] = useState(false);
  const [accepted, setAccepted] = useState<{ ulid: string; name: string } | null>(null);

  async function onAccept() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await acceptInvitation(token);
      setAccepted(res.family_space);
      // Optimistic membership so AppShell has a space immediately, then
      // pin the active-space cookie + refresh /me for the real payload.
      upsertFamilySpace({
        ulid: res.family_space.ulid,
        name: res.family_space.name,
        role: 'member',
      });
      await setActiveSpaceId(res.family_space.ulid);
      await refresh();
      void revalidateAllData();
    } catch (err) {
      if (err instanceof ApiError && (err.status === 403 || err.status === 410)) {
        setLinkDead(true);
        setError('That invite link has already been used.');
      } else if (err instanceof ApiError && (err.status === 404 || err.status === 422)) {
        setLinkDead(true);
        setError('This invite link isn\u2019t valid anymore. Ask your family member to send a new invitation.');
      } else {
        const msg = err instanceof ApiError ? err.message : 'Could not accept this invitation.';
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function goHome() {
    router.replace('/home');
  }

  if (loading) {
    return (
      <div className="invite-page">
        <p className="invite-page__lede">Checking your session…</p>
      </div>
    );
  }

  if (!user) {
    const next = encodeURIComponent(`/invite/${token}`);
    return (
      <div className="invite-page">
        <h1 className="invite-page__title">You&apos;ve been invited.</h1>
        <p className="invite-page__lede">
          Sign in or create your account to join the family space.
        </p>
        <div className="vis-row vis-row--center">
          <Link href={`/?next=${next}`} className="btn-save">Sign in</Link>
          <Link href={`/signup?next=${next}`} className="btn-outline">Create account</Link>
        </div>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="invite-page">
        <h1 className="invite-page__title">Welcome to {accepted.name}.</h1>
        <p className="invite-page__lede">
          You&apos;re now part of this family space. Their kinlooms are waiting for you.
        </p>
        <div className="vis-row vis-row--center">
          <button type="button" className="btn-save" onClick={goHome}>Go to home</button>
        </div>
      </div>
    );
  }

  if (linkDead) {
    return (
      <div className="invite-page">
        <h1 className="invite-page__title">This invitation is no longer active.</h1>
        <p className="invite-page__lede">{error}</p>
        <div className="vis-row vis-row--center">
          <button type="button" className="btn-save" onClick={goHome}>Go to home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="invite-page">
      <h1 className="invite-page__title">Join this family space?</h1>
      <p className="invite-page__lede">
        You&apos;re signed in as <strong>{user.email}</strong>. Accepting will add this family space to your account.
      </p>
      {error && <p className="form-status form-status--error">{error}</p>}
      <div className="vis-row vis-row--center">
        <button type="button" className="btn-save" onClick={onAccept} disabled={submitting}>
          {submitting ? 'Accepting…' : 'Accept invitation'}
        </button>
        <Link href="/home" className="btn-outline">Not now</Link>
      </div>
    </div>
  );
}
