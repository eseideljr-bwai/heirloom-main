'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import { errorText, upgradePlan } from '../../lib/settings';
import { revalidateAllData } from '../actions';

/**
 * "Upgrade to Family": one click, no checkout (there is no billing yet).
 * `POST /me/plan` answers at once, then the auth user is refreshed so
 * `can_create_space` is current and whatever was gated on it opens in place.
 * There is no downgrade, so the note under the button says so up front instead
 * of adding a confirmation step to a free action.
 */
export default function UpgradeToFamily({ className = 'btn-save' }: { className?: string }) {
  const { refresh } = useAuth();
  const router = useRouter();
  const noteId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upgrade() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await upgradePlan('family');
      await refresh();
      void revalidateAllData();
      router.refresh();
    } catch (err) {
      setError(errorText(err, 'Could not upgrade your plan. Nothing was changed.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="upgrade-plan">
      <button type="button" className={className} onClick={upgrade} disabled={busy} aria-describedby={noteId}>
        {busy ? 'Upgrading…' : 'Upgrade to Family'}
      </button>
      <p id={noteId} className="upgrade-plan__note">Free for now. A plan can’t be moved back down.</p>
      {error && <p className="form-status form-status--error" role="alert">{error}</p>}
    </div>
  );
}
