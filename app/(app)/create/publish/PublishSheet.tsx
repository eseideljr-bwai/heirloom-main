'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateKinloom } from '../../../../lib/kinloom';
import { ApiError } from '../../../../lib/api';
import { postToNative } from '../../../../lib/embed';

export type PublishTarget = {
  id: string;
  name: string;
  meta: string;
  /** False while onward publishing has no endpoint behind it. */
  available: boolean;
};

/**
 * Step 3 of the create flow — "Who can see it".
 *
 * The design gives a kinloom a *set* of publication targets: its Home,
 * and any Family Spaces that Home belongs to. The API still carries a
 * single `visibility: 'family' | 'private'`, so only the Home row can
 * actually be committed today; Family Space rows render as the design
 * draws them but are inert.
 *
 * When the publications endpoints land (backend Workstream 4.2),
 * `commit()` is the only thing that has to change.
 */
export default function PublishSheet({
  kinloomId,
  familySpaceId,
  typeLabel,
  title,
  homeName,
  homeMemberCount,
  spaces,
}: {
  kinloomId: string;
  familySpaceId: string;
  typeLabel: string;
  title: string;
  homeName: string;
  homeMemberCount: number | null;
  spaces: PublishTarget[];
}) {
  const router = useRouter();
  // Home preselected, nothing else — as the design specifies.
  const [toHome, setToHome] = useState(true);
  const [toSpaces, setToSpaces] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPrivate = !toHome && toSpaces.length === 0;
  const reach = (toHome ? homeMemberCount ?? 0 : 0);

  const summary = isPrivate
    ? 'Private. Only you can read it.'
    : homeMemberCount == null
      ? 'Your Family Home will be able to read this.'
      : `${reach} ${reach === 1 ? 'person' : 'people'} will be able to read this.`;

  const commit = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateKinloom(familySpaceId, kinloomId, {
        visibility: isPrivate ? 'private' : 'family',
      });
      // Inside the iOS WebView the flow ends here; native closes the view.
      if (postToNative({ type: 'publishComplete', kinloomIds: [kinloomId] })) return;
      router.push(`/library/${kinloomId}`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.firstFieldError() || err.message
          : 'Could not save where this is published.',
      );
      setSaving(false);
    }
  };

  const Option = ({
    name,
    meta,
    on,
    disabled,
    onToggle,
  }: {
    name: string;
    meta: string;
    on: boolean;
    disabled?: boolean;
    onToggle: () => void;
  }) => (
    <button
      type="button"
      className={`pub-option${on ? ' is-on' : ''}`}
      aria-pressed={on}
      disabled={disabled || saving}
      onClick={onToggle}
    >
      <span className="pub-option__box" aria-hidden="true">{on ? '✓' : ''}</span>
      <span className="pub-option__text">
        <span className="pub-option__name">{name}</span>
        <span className="pub-option__meta">{meta}</span>
      </span>
    </button>
  );

  return (
    <div className="pub-sheet">
      <p className="pub-sheet__type">{typeLabel}</p>
      <p className="pub-sheet__title">{title || 'Untitled'}</p>

      <div className="pub-group">
        <p className="pub-group__label">Private</p>
        <div className="pub-group__opts">
          <Option
            name="Keep private"
            meta="Only you. It stays in your Vault."
            on={isPrivate}
            onToggle={() => { setToHome(false); setToSpaces([]); }}
          />
        </div>
      </div>

      <div className="pub-group">
        <p className="pub-group__label">Family Home</p>
        <div className="pub-group__opts">
          <Option
            name={`Publish to ${homeName}`}
            meta={
              homeMemberCount == null
                ? 'Your Family Home'
                : `Your Family Home · ${homeMemberCount} ${homeMemberCount === 1 ? 'person' : 'people'}`
            }
            on={toHome}
            onToggle={() => setToHome(v => !v)}
          />
        </div>
      </div>

      <div className="pub-group">
        <p className="pub-group__label">Family Spaces</p>
        <div className="pub-group__opts">
          {spaces.length === 0 ? (
            <p className="pub-group__empty">
              Publishing onward to a Family Space isn&rsquo;t available yet.
              Anything you publish here stays in your Family Home.
            </p>
          ) : (
            spaces.map(s => (
              <Option
                key={s.id}
                name={`Publish to ${s.name}`}
                meta={s.meta}
                on={toSpaces.includes(s.id)}
                disabled={!s.available}
                onToggle={() =>
                  setToSpaces(v => (v.includes(s.id) ? v.filter(x => x !== s.id) : [...v, s.id]))
                }
              />
            ))
          )}
        </div>
      </div>

      {error && <p className="create-banner create-banner--error">{error}</p>}

      <div className="pub-sheet__foot">
        <span className="pub-sheet__summary">{summary}</span>
        <button type="button" className="pub-sheet__go" disabled={saving} onClick={commit}>
          {saving ? 'Saving…' : isPrivate ? 'Keep in my Vault' : 'Publish'}
        </button>
      </div>
    </div>
  );
}
