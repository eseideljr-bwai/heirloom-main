'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { kinloomApi } from '../../../../lib/kinloom-api';
import {
  addComment,
  deleteComment,
  roomKey,
  type KinloomComment,
  type RoomType,
} from '../../../../lib/kinloom';
import { ApiError } from '../../../../lib/api';
import { revalidateKinloomData } from '../../../actions';

type Props = {
  kinloomId: string;
  /** The room whose thread this is: comments never cross rooms. */
  room: { type: RoomType; id: string };
  initialComments: KinloomComment[];
  /** Total comments in the room, for the count and "load more". */
  total: number;
  /** A read-only room takes no new comments (deleting is still allowed). */
  readOnly: boolean;
};

/** Author fields, which are name-only when the author sits outside your people. */
function authorView(a: KinloomComment['author']) {
  const full = 'id' in a ? a : null;
  return {
    name: a.name,
    tone: full?.tone || '#a39376',
    initials: full?.initials || a.name?.charAt(0) || '?',
  };
}

export default function Comments({ kinloomId, room, initialComments, total, readOnly }: Props) {
  const router = useRouter();
  const [comments, setComments] = useState<KinloomComment[]>(initialComments);
  const [count, setCount] = useState(total);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    setError(null);
    setSubmitting(true);
    try {
      const created = await addComment(kinloomId, room, trimmed);
      setComments(prev => [...prev, created]);
      setCount(n => n + 1);
      setBody('');
      // Revalidate SSR pages that count or display comments.
      void revalidateKinloomData(kinloomId);
      router.refresh();
    } catch (err) {
      const msg = err instanceof ApiError
        ? (err.firstFieldError() || err.message)
        : 'Could not post that comment.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(commentId: string) {
    setPendingDelete(commentId);
    try {
      await deleteComment(kinloomId, commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
      setCount(n => Math.max(0, n - 1));
      void revalidateKinloomData(kinloomId);
      router.refresh();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Could not delete.';
      setError(msg);
    } finally {
      setPendingDelete(null);
    }
  }

  async function loadMore() {
    setLoadingMore(true);
    try {
      const next = await kinloomApi.get('/kinlooms/{kinloom}/comments', {
        path: { kinloom: kinloomId },
        query: { room: roomKey(room), page: page + 1 },
      });
      setComments(prev => {
        const seen = new Set(prev.map(c => c.id));
        return [...prev, ...next.data.filter(c => !seen.has(c.id))];
      });
      setPage(page + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load more comments.');
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <section className="comments">
      <h2 className="comments__title">
        Conversation
        {count > 0 && <span className="comments__count">· {count}</span>}
      </h2>

      {comments.length === 0 ? (
        <p className="comments__empty">No comments yet. Be the first to add one.</p>
      ) : (
        <ul className="comments__list">
          {comments.map(c => {
            const { name, tone, initials } = authorView(c.author);
            return (
              <li key={c.id} className="comments__row">
                <span className="comments__avatar comments__avatar--swatch" data-tone={tone}>
                  <span className="comments__avatar-bg" style={{ background: tone + '28' }} />
                  <span className="comments__avatar-text" style={{ color: tone }}>{initials}</span>
                </span>
                <div className="comments__body">
                  <p className="comments__byline">
                    <strong>{name || 'Someone'}</strong>
                    {c.created_at && <span className="comments__when"> · {formatWhen(c.created_at)}</span>}
                  </p>
                  <p className="comments__text">{c.body}</p>
                </div>
                {c.can_delete && (
                  <button
                    type="button"
                    className="comments__delete"
                    onClick={() => onDelete(c.id)}
                    disabled={pendingDelete === c.id}
                    aria-label="Delete comment"
                  >
                    {pendingDelete === c.id ? '…' : '×'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {comments.length < count && (
        <button type="button" className="btn-outline btn-outline--sm" onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? 'Loading…' : 'Show more comments'}
        </button>
      )}

      {readOnly ? (
        <p className="comments__empty">This room is read-only, so new comments can&rsquo;t be added.</p>
      ) : (
      <form onSubmit={onSubmit} className="comments__form">
        <textarea
          className="field-input field-input--textarea"
          placeholder="Add to the conversation…"
          value={body}
          onChange={e => setBody(e.target.value)}
          maxLength={2000}
          rows={3}
          disabled={submitting}
        />
        {error && <p className="form-status form-status--error">{error}</p>}
        <div className="comments__form-actions">
          <button type="submit" className="btn-save" disabled={submitting || !body.trim()}>
            {submitting ? 'Posting…' : 'Post'}
          </button>
        </div>
      </form>
      )}
    </section>
  );
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
