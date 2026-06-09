'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  addComment,
  deleteComment,
  type Comment,
} from '../../../../lib/kinloom';
import { ApiError } from '../../../../lib/api';
import { revalidateKinloomData } from '../../../actions';

type Props = {
  familySpaceId: string;
  kinloomId: string;
  initialComments: Comment[];
  /** member_id of the current viewer in this family space, if known. */
  currentMemberId: string | null;
};

export default function Comments({ familySpaceId, kinloomId, initialComments, currentMemberId }: Props) {
  const router = useRouter();
  const [comments, setComments] = useState<Comment[]>(initialComments);
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
      const created = await addComment(familySpaceId, kinloomId, trimmed);
      setComments(prev => [...prev, created]);
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
      await deleteComment(familySpaceId, kinloomId, commentId);
      setComments(prev => prev.filter(c => c.ulid !== commentId));
      void revalidateKinloomData(kinloomId);
      router.refresh();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Could not delete.';
      setError(msg);
    } finally {
      setPendingDelete(null);
    }
  }

  return (
    <section className="comments">
      <h2 className="comments__title">
        Conversation
        {comments.length > 0 && <span className="comments__count">· {comments.length}</span>}
      </h2>

      {comments.length === 0 ? (
        <p className="comments__empty">No comments yet. Be the first to add one.</p>
      ) : (
        <ul className="comments__list">
          {comments.map(c => {
            const isMine = !!currentMemberId && c.author?.member_id === currentMemberId;
            const tone = c.author?.tone || '#a39376';
            const initials = c.author?.initials || c.author?.name?.charAt(0) || '?';
            return (
              <li key={c.ulid} className="comments__row">
                <span className="comments__avatar comments__avatar--swatch" data-tone={tone}>
                  <span className="comments__avatar-bg" style={{ background: tone + '28' }} />
                  <span className="comments__avatar-text" style={{ color: tone }}>{initials}</span>
                </span>
                <div className="comments__body">
                  <p className="comments__byline">
                    <strong>{c.author?.name || 'Someone'}</strong>
                    {c.created_at && <span className="comments__when"> · {formatWhen(c.created_at)}</span>}
                  </p>
                  <p className="comments__text">{c.body}</p>
                </div>
                {isMine && (
                  <button
                    type="button"
                    className="comments__delete"
                    onClick={() => onDelete(c.ulid)}
                    disabled={pendingDelete === c.ulid}
                    aria-label="Delete comment"
                  >
                    {pendingDelete === c.ulid ? '…' : '×'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

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
    </section>
  );
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
