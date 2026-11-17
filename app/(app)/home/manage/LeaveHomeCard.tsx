'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '../../../../lib/api';
import { useAuth } from '../../../../lib/auth-context';
import { leaveHomeForSolo } from '../../../../lib/home-manage';
import { revalidateFamilyData } from '../../../actions';

type Props = {
  homeId: string;
  homeName: string;
  /** The viewer's role in this Home. Only used for the wording. */
  role: 'owner' | 'co_owner' | 'member';
  /** `viewer.can_leave` from `GET /family-homes/{id}`: leaving would succeed now. */
  canLeave: boolean;
};

function leaveError(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { error?: unknown } | null;
    if (body && body.error === 'transfer_ownership_first') {
      return 'You own this home, so someone else has to take it over first. Make another person the owner, then leave.';
    }
    if (err.status === 429) return 'You’re going too fast. Give it a moment and try again.';
    if (err.status === 401) return 'Your session has expired. Please sign in again.';
    return err.message || 'Couldn’t leave this home. Please try again.';
  }
  return 'Couldn’t leave this home. Please try again.';
}

/**
 * "Leave this home". Shown to every role, including members, who can't open
 * Manage Family but can still leave. Whether leaving works comes from the
 * API (`can_leave`), never from the role: an owner whose other accounts are
 * all memorialized may leave, any other owner must transfer ownership first.
 */
export default function LeaveHomeCard({ homeId, homeName, role, canLeave }: Props) {
  const router = useRouter();
  const { refresh: refreshAuth } = useAuth();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function leave() {
    setError(null);
    setSubmitting(true);
    try {
      await leaveHomeForSolo(homeId);
    } catch (err) {
      setError(leaveError(err));
      setSubmitting(false);
      return;
    }
    // You are in a new Home now: drop everything cached about the old one.
    await revalidateFamilyData();
    await refreshAuth();
    router.replace('/home');
    router.refresh();
  }

  return (
    <>
      <div className="mg-card mg-card--spaced mg-leave">
        <div className="mg-card__head">
          <span className="mg-card__title">Leave this home</span>
        </div>
        {canLeave ? (
          <div className="mg-leave__body">
            <p className="mg-leave__text">
              You&apos;d move to a Family Home of your own and keep your Vault, your kinlooms and your
              comments. What you published here is taken back.
            </p>
            <button type="button" className="mg-btn mg-btn--danger" onClick={() => setOpen(true)}>
              Leave home
            </button>
          </div>
        ) : (
          <p className="mg-card__empty">
            {role === 'owner'
              ? 'You own this home, so you can’t leave until someone else takes it over. Open Roles next to a person above and make them the owner.'
              : 'You can’t leave this home right now.'}
          </p>
        )}
      </div>

      {open && (
        <div
          className="modal-backdrop"
          onClick={e => { if (e.target === e.currentTarget && !submitting) setOpen(false); }}
        >
          <div className="modal">
            <h3 className="modal-title">Leave {homeName}?</h3>
            <p className="modal-text">
              You move, with everything that is yours, into a new Family Home that you own. Your Vault,
              kinlooms and comments stay as they are.
            </p>
            <p className="modal-text">
              What you published to this home and its Family Spaces is taken back, including anything set
              to share after you pass. The family profiles stay here
              {role === 'co_owner' ? ', and you stop being its co-owner' : ''}.
            </p>
            <p className="modal-text">
              If this home is in a Family Space, that Space&apos;s owner is asked whether your new home may
              join. Until they agree, your new home is in none.
            </p>
            {error && <p className="form-status form-status--error">{error}</p>}
            <div className="modal-actions">
              <button type="button" className="btn-outline" onClick={() => setOpen(false)} disabled={submitting}>
                Stay
              </button>
              <button type="button" className="btn-danger-solid" onClick={leave} disabled={submitting}>
                {submitting ? 'Leaving…' : 'Leave home'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
