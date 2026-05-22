'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  deleteKinloom,
  getCreateContext,
  updateKinloom,
  type Kinloom,
  type Visibility,
  type TaggableMember,
} from '../../../../lib/kinloom';
import { ApiError } from '../../../../lib/api';
import { revalidateKinloomData } from '../../../actions';

type Props = {
  familySpaceId: string;
  kinloom: Kinloom;
  canEdit: boolean;
  canDelete: boolean;
};

export default function KinloomActions({
  familySpaceId,
  kinloom,
  canEdit,
  canDelete,
}: Props) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  if (!canEdit && !canDelete) return null;

  return (
    <div className="kinloom-menu" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen(o => !o)}
        className="kinloom-menu__toggle"
        aria-label="Kinloom actions"
        aria-expanded={menuOpen}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
      </button>
      {menuOpen && (
        <div className="kinloom-menu__sheet" role="menu">
          {canEdit && (
            <button
              type="button"
              role="menuitem"
              className="kinloom-menu__item"
              onClick={() => { setMenuOpen(false); setEditOpen(true); }}
            >
              Edit
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              role="menuitem"
              className="kinloom-menu__item kinloom-menu__item--danger"
              onClick={() => { setMenuOpen(false); setDeleteOpen(true); }}
            >
              Delete
            </button>
          )}
        </div>
      )}

      {editOpen && (
        <EditKinloomModal
          familySpaceId={familySpaceId}
          kinloom={kinloom}
          onCancel={() => setEditOpen(false)}
          onSaved={async () => {
            setEditOpen(false);
            await revalidateKinloomData(kinloom.ulid);
            router.refresh();
          }}
        />
      )}

      {deleteOpen && (
        <DeleteKinloomModal
          familySpaceId={familySpaceId}
          kinloomId={kinloom.ulid}
          onCancel={() => setDeleteOpen(false)}
          onDeleted={async () => {
            await revalidateKinloomData(kinloom.ulid);
            router.replace('/library');
          }}
        />
      )}
    </div>
  );
}

// ─── Edit modal ─────────────────────────────────────────────────────

function bodyToText(body_paragraphs: Kinloom['body_paragraphs']): string {
  if (Array.isArray(body_paragraphs)) {
    return body_paragraphs.map(p => typeof p === 'string' ? p : String(p ?? '')).join('\n\n');
  }
  if (typeof body_paragraphs === 'string') return body_paragraphs;
  if (body_paragraphs && typeof body_paragraphs === 'object') {
    return Object.values(body_paragraphs as Record<string, unknown>).map(v => String(v ?? '')).join('\n\n');
  }
  return '';
}

function taggedIds(value: Kinloom['tagged_kin']): string[] {
  if (Array.isArray(value)) return value.map(m => m.member_id);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((m: { member_id: string }) => m.member_id);
    } catch {
      return [];
    }
  }
  return [];
}

function EditKinloomModal({
  familySpaceId,
  kinloom,
  onCancel,
  onSaved,
}: {
  familySpaceId: string;
  kinloom: Kinloom;
  onCancel: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [title, setTitle] = useState(kinloom.title || '');
  const [body, setBody] = useState(bodyToText(kinloom.body_paragraphs));
  const [visibility, setVisibility] = useState<Visibility>((kinloom.visibility as Visibility) || 'family');
  const [tagged, setTagged] = useState<string[]>(taggedIds(kinloom.tagged_kin));
  const [taggableMembers, setTaggableMembers] = useState<TaggableMember[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ctx = await getCreateContext(familySpaceId, kinloom.type_slug);
        if (!cancelled) setTaggableMembers(ctx.taggableMembers);
      } catch {
        if (!cancelled) setTaggableMembers([]);
      }
    })();
    return () => { cancelled = true; };
  }, [familySpaceId, kinloom.type_slug]);

  const toggleKin = (id: string) =>
    setTagged(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) {
      setError('Please write something before saving.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await updateKinloom(familySpaceId, kinloom.ulid, {
        title: title.trim() || 'Untitled',
        body: body.trim(),
        visibility,
        tagged_member_ids: tagged,
      });
      await onSaved();
    } catch (err) {
      const msg = err instanceof ApiError
        ? (err.firstFieldError() || err.message)
        : 'Could not save changes.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={e => { if (e.target === e.currentTarget && !submitting) onCancel(); }}
    >
      <form className="modal modal--wide" onSubmit={onSubmit}>
        <h3 className="modal-title">Edit kinloom</h3>
        <p className="modal-text">Adjust the title, words, who it&apos;s for, and who can see it.</p>

        <div className="settings-fields">
          <div>
            <label className="field-label" htmlFor="edit-title">Title</label>
            <input
              id="edit-title"
              className="field-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={255}
              disabled={submitting}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="edit-body">Words</label>
            <textarea
              id="edit-body"
              className="field-input field-input--textarea"
              value={body}
              onChange={e => setBody(e.target.value)}
              maxLength={65000}
              rows={10}
              disabled={submitting}
            />
          </div>

          <div>
            <p className="field-label">Visibility</p>
            <div className="vis-row">
              {(['family', 'private'] as Visibility[]).map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVisibility(v)}
                  className={`vis-chip${visibility === v ? ' is-active' : ''}`}
                  disabled={submitting}
                >
                  {v === 'family' ? 'Family' : 'Only me'}
                </button>
              ))}
            </div>
          </div>

          {taggableMembers.length > 0 && (
            <div>
              <p className="field-label">For</p>
              <div className="vis-row vis-row--wrap">
                {taggableMembers.map(m => {
                  const on = tagged.includes(m.member_id);
                  return (
                    <button
                      key={m.member_id}
                      type="button"
                      className={`vis-chip${on ? ' is-active' : ''}`}
                      onClick={() => toggleKin(m.member_id)}
                      disabled={submitting}
                    >
                      {m.name.split(' ')[0]}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {error && <p className="form-status form-status--error">{error}</p>}
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn-save" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Delete confirm modal ──────────────────────────────────────────

function DeleteKinloomModal({
  familySpaceId,
  kinloomId,
  onCancel,
  onDeleted,
}: {
  familySpaceId: string;
  kinloomId: string;
  onCancel: () => void;
  onDeleted: () => void | Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onConfirm() {
    setError(null);
    setSubmitting(true);
    try {
      await deleteKinloom(familySpaceId, kinloomId);
      await onDeleted();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Could not delete.';
      setError(msg);
      setSubmitting(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={e => { if (e.target === e.currentTarget && !submitting) onCancel(); }}
    >
      <div className="modal">
        <h3 className="modal-title">Delete this kinloom?</h3>
        <p className="modal-text">
          This permanently removes the kinloom, its photo, voice, and any comments. This cannot be undone.
        </p>
        {error && <p className="form-status form-status--error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn-outline" onClick={onCancel} disabled={submitting}>Cancel</button>
          <button type="button" className="btn-danger-solid" onClick={onConfirm} disabled={submitting}>
            {submitting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
