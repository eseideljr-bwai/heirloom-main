'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getReach,
  setKinloomPublications,
  updateKinloom,
  type KinloomStatus,
  type PublicationRoom,
  type PublicationTarget,
} from '../../../../lib/kinloom';
import { ApiError } from '../../../../lib/api';
import { postToNative } from '../../../../lib/embed';
import { revalidateKinloomData } from '../../../actions';

const roomKey = (r: { type: string; id: string }) => `${r.type}:${r.id}`;

const people = (n: number) => `${n} ${n === 1 ? 'person' : 'people'}`;

/**
 * Step 3 of the create flow: "Who can see it".
 *
 * A kinloom has a *set* of publication targets: the author's Family Home and
 * any Family Space that Home is active in. The API returns every room the
 * author may publish to, with who can read it and where it is published now.
 * Clients never infer readers; the numbers shown come from the API.
 *
 * A draft is finalized and published in one request. A final kinloom
 * replaces its publication set (which can also retract it).
 */
export default function PublishSheet({
  kinloomId,
  status,
  typeLabel,
  title,
  rooms,
  defaultTarget,
}: {
  kinloomId: string;
  status: KinloomStatus;
  typeLabel: string;
  title: string;
  rooms: PublicationRoom[];
  defaultTarget: 'home' | 'private';
}) {
  const router = useRouter();
  const isDraft = status === 'draft';

  const home = rooms.find((r) => r.type === 'home') ?? null;
  const spaces = rooms.filter((r) => r.type === 'space');

  // Where it is published now (final), or the author's default (draft: Home
  // preselected, nothing else, as the design specifies).
  const initialSelected = useMemo(() => {
    const set = new Set<string>();
    if (isDraft) {
      if (home && !home.read_only && defaultTarget === 'home') set.add(roomKey(home));
    } else {
      for (const r of rooms) if (r.when !== null) set.add(roomKey(r));
    }
    return set;
  }, [rooms, isDraft, home, defaultTarget]);

  const [selected, setSelected] = useState<Set<string>>(initialSelected);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPrivate = selected.size === 0;

  // Reach: a single room's count comes with the room; two or more need the
  // API to de-duplicate people who sit in both, so ask it (latest wins).
  const [combined, setCombined] = useState<{ key: string; accounts: number } | null>(null);
  const selectedRooms = rooms.filter((r) => selected.has(roomKey(r)));
  const selectionKey = selectedRooms.map(roomKey).join(',');
  const requestRef = useRef(0);

  useEffect(() => {
    if (selectedRooms.length < 2) return;
    const id = ++requestRef.current;
    getReach(selectedRooms)
      .then((res) => {
        if (id === requestRef.current) setCombined({ key: selectionKey, accounts: res.accounts });
      })
      .catch(() => {
        if (id === requestRef.current) setCombined(null);
      });
    // selectionKey captures the selected rooms.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionKey]);

  const reach: number | null =
    selectedRooms.length === 0
      ? 0
      : selectedRooms.length === 1
        ? selectedRooms[0].accounts
        : combined?.key === selectionKey
          ? combined.accounts
          : null;

  const summary = isPrivate
    ? 'Private. Only you can read it.'
    : reach == null
      ? 'Counting who can read this…'
      : reach === 0
        ? 'No one else can read this yet.'
        : `${people(reach)} will be able to read this.`;

  const toggle = (r: PublicationRoom) => {
    const key = roomKey(r);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const commit = async () => {
    setSaving(true);
    setError(null);
    try {
      // `when` is kept for rooms already published; new ones go out now.
      const targets: PublicationTarget[] = selectedRooms.map((r) => ({
        type: r.type,
        id: r.id,
        when: r.when ?? 'now',
      }));

      if (isDraft) {
        await updateKinloom(kinloomId, { status: 'final', publish: targets });
      } else if (!sameSet(initialSelected, selected)) {
        await setKinloomPublications(kinloomId, targets);
      }

      void revalidateKinloomData(kinloomId);
      // Inside the iOS WebView the flow ends here; native closes the view.
      if (postToNative({ type: 'publishComplete', kinloomIds: [kinloomId] })) return;
      router.push(`/library/${kinloomId}`);
    } catch (err) {
      setError(publishErrorMessage(err));
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

  const roomMeta = (r: PublicationRoom, kind: string) => {
    const parts = [kind];
    if (r.read_only) parts.push('read-only');
    else parts.push(`${people(r.accounts)} can read`);
    if (r.when === 'on_passing') parts.push('after I pass');
    return parts.join(' · ');
  };

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
            onToggle={() => setSelected(new Set())}
          />
        </div>
      </div>

      {home && (
        <div className="pub-group">
          <p className="pub-group__label">Family Home</p>
          <div className="pub-group__opts">
            <Option
              name={`Publish to ${home.name}`}
              meta={roomMeta(home, 'Your Family Home')}
              on={selected.has(roomKey(home))}
              disabled={home.read_only}
              onToggle={() => toggle(home)}
            />
          </div>
        </div>
      )}

      <div className="pub-group">
        <p className="pub-group__label">Family Spaces</p>
        <div className="pub-group__opts">
          {spaces.length === 0 ? (
            <p className="pub-group__empty">
              Your Family Home isn&rsquo;t in a Family Space yet. Anything you publish here stays in your Family Home.
            </p>
          ) : (
            spaces.map((s) => (
              <Option
                key={s.id}
                name={`Publish to ${s.name}`}
                meta={roomMeta(s, 'Family Space')}
                on={selected.has(roomKey(s))}
                disabled={s.read_only}
                onToggle={() => toggle(s)}
              />
            ))
          )}
        </div>
      </div>

      {error && <p className="create-banner create-banner--error">{error}</p>}

      <div className="pub-sheet__foot">
        <span className="pub-sheet__summary">{summary}</span>
        <button type="button" className="pub-sheet__go" disabled={saving} onClick={commit}>
          {saving
            ? 'Saving…'
            : isPrivate
              ? (isDraft ? 'Keep in my Vault' : 'Make private')
              : 'Publish'}
        </button>
      </div>
    </div>
  );
}

function sameSet(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  return Array.from(a).every((v) => b.has(v));
}

function publishErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 423) return 'One of those rooms is read-only right now, so nothing new can be published to it.';
    if (err.status === 404) return 'That room is no longer available. Refresh and try again.';
    return err.firstFieldError() || err.message;
  }
  return 'Could not save where this is published.';
}
