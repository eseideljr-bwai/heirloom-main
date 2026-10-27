'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toggleHold, type RoomType } from '../../../../lib/kinloom';
import { revalidateKinloomData } from '../../../actions';

type Props = {
  kinloomId: string;
  /** The room whose holds these are: a hold belongs to one room. */
  room: { type: RoomType; id: string };
  initialHeldByMe: boolean;
  initialCount: number;
  /** In a read-only room you can release a hold but not add one. */
  readOnly?: boolean;
};

export default function HoldButton({ kinloomId, room, initialHeldByMe, initialCount, readOnly = false }: Props) {
  const router = useRouter();
  const [held, setHeld] = useState({ by_me: initialHeldByMe, count: initialCount });
  const [pending, setPending] = useState(false);

  async function onClick() {
    if (pending) return;
    setPending(true);
    try {
      const next = await toggleHold(kinloomId, room);
      setHeld({ by_me: next.held_by_me, count: next.count });
      void revalidateKinloomData(kinloomId);
      router.refresh();
    } catch {
      // ignore
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending || (readOnly && !held.by_me)}
      className={`hold-button${held.by_me ? ' is-held' : ''}`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
      {held.by_me ? 'Holding' : 'Hold a moment'}
      {held.count > 0 && <span className="hold-button__count">· {held.count}</span>}
    </button>
  );
}
