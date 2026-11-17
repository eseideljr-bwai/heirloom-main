'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  setKinloomPublications,
  updateKinloom,
  type KinloomStatus,
  type PublicationRoom,
  type PublicationTarget,
} from '../../../../lib/kinloom';
import { ApiError } from '../../../../lib/api';
import { postToNative } from '../../../../lib/embed';
import { revalidateKinloomData } from '../../../actions';
import AudiencePicker, {
  audienceSummary,
  roomKey,
  useSelectionReach,
} from '../../../components/AudiencePicker';

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

  const selectedRooms = rooms.filter((r) => selected.has(roomKey(r)));
  const reach = useSelectionReach(selectedRooms);
  const summary = audienceSummary(selectedRooms.length, reach);

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

  return (
    <div className="pub-sheet">
      <p className="pub-sheet__type">{typeLabel}</p>
      <p className="pub-sheet__title">{title || 'Untitled'}</p>

      <AudiencePicker rooms={rooms} selected={selected} onChange={setSelected} disabled={saving} />

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
