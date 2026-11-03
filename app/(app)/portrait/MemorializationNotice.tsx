'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { kinloomApi } from '../../../lib/kinloom-api';
import { ApiError } from '../../../lib/api';

/**
 * An open request to memorialize someone's account. Shown only to the people
 * the API lets see it, and Cancel only while `can_cancel` is true, so there is
 * nothing to work out here: the notice says what the API said.
 */
export default function MemorializationNotice({
  personId,
  name,
  isYou,
  requestedBy,
  effectiveAt,
  canCancel,
}: {
  personId: string;
  name: string;
  isYou: boolean;
  requestedBy: string;
  effectiveAt: string;
  canCancel: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const when = new Date(effectiveAt);
  const date = Number.isNaN(when.getTime())
    ? effectiveAt
    : when.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      await kinloomApi.delete('/people/{member}/memorialization', { path: { member: personId } });
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 403
          ? 'It is too late to cancel this request.'
          : err instanceof ApiError && err.status === 429
            ? 'Too many tries. Please wait a moment and try again.'
            : 'We couldn’t cancel the request. Please try again.',
      );
      setBusy(false);
    }
  }

  return (
    <div className="portrait-memorial" role="status">
      <p className="portrait-memorial__text">
        {isYou
          ? `${requestedBy} asked to memorialize your account. It takes effect on ${date}.`
          : `${requestedBy} asked to memorialize ${name}’s account. It takes effect on ${date}.`}
      </p>
      {canCancel && (
        <button type="button" className="portrait-memorial__btn" onClick={cancel} disabled={busy}>
          {busy ? 'Cancelling…' : 'Cancel the request'}
        </button>
      )}
      {error && <p className="portrait-memorial__error" role="alert">{error}</p>}
    </div>
  );
}
