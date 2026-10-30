'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApiError } from '../../lib/api';
import { useActiveFamilySpace } from '../../lib/active-family-space';
import { useAuth } from '../../lib/auth-context';
import { createFamilySpace } from '../../lib/space-manage';

function createError(err: unknown): string {
  if (!(err instanceof ApiError)) return 'Couldn’t create the Family Space. Please try again.';
  if (err.status === 402) return 'Creating a Family Space needs the Family plan.';
  if (err.status === 403) return 'Only the owner or a co-owner of your Family Home can create a Family Space.';
  if (err.status === 422) return err.firstFieldError() ?? 'Check the name and try again.';
  if (err.status === 429) return 'You’re going too fast. Give it a moment and try again.';
  return 'Couldn’t create the Family Space. Please try again.';
}

/**
 * "Create a Family Space", shown where a Home that is in no Space lands.
 * Offered only when `GET /me` says `can_create_space`; otherwise it says why
 * not, from the plan and the person's role in their Home.
 */
export default function CreateSpaceCard() {
  const { user, refresh } = useAuth();
  const { setActiveFamilySpaceId } = useActiveFamilySpace();
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  if (!user.can_create_space) {
    const ownsHome = user.home.role === 'owner' || user.home.role === 'co_owner';
    return (
      <p className="empty-card__sub">
        {ownsHome && user.plan !== 'family'
          ? 'Creating a Family Space needs the Family plan. Your plan is in Settings.'
          : 'Only the owner or a co-owner of your Family Home can create a Family Space. Ask them, or wait for an invitation.'}
      </p>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Give the Family Space a name.'); return; }
    setError(null);
    setSubmitting(true);
    try {
      const space = await createFamilySpace(name, description);
      await refresh();
      await setActiveFamilySpaceId(space.id);
      router.push('/spaces/manage');
    } catch (err) {
      setError(createError(err));
      setSubmitting(false);
    }
  }

  return (
    <form className="settings-fields" onSubmit={onSubmit} style={{ textAlign: 'left', maxWidth: 420, margin: '8px auto 0' }}>
      <p className="empty-card__sub" style={{ marginBottom: 4 }}>
        Or start your own. Your Family Home becomes its first Home, and you invite the others.
      </p>
      <div>
        <label className="field-label" htmlFor="create-space-name">Name</label>
        <input
          id="create-space-name"
          className="field-input"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={255}
          placeholder="The Okonjo Cousins"
          disabled={submitting}
          required
        />
      </div>
      <div>
        <label className="field-label" htmlFor="create-space-description">Description (optional)</label>
        <textarea
          id="create-space-description"
          className="field-input"
          value={description}
          onChange={e => setDescription(e.target.value)}
          maxLength={2000}
          rows={3}
          disabled={submitting}
        />
      </div>
      {error && (
        <p className="form-status form-status--error">
          {error}
          {error.includes('Family plan') && <> <Link href="/settings">Open Settings</Link></>}
        </p>
      )}
      <div>
        <button type="submit" className="btn-save" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create Family Space'}
        </button>
      </div>
    </form>
  );
}
