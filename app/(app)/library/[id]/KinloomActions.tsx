'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  deleteKinloom,
  deleteMedia,
  getCreateContext,
  isVideoMedia,
  MAX_KINLOOM_PHOTOS,
  MAX_PHOTO_BYTES,
  PHOTO_MIME_TYPES,
  readImageDimensions,
  updateKinloom,
  uploadKinloomAudio,
  uploadKinloomPhoto,
  type KinloomDetail,
  type UpdateKinloomBody,
  type TaggableMember,
} from '../../../../lib/kinloom';
import { ApiError } from '../../../../lib/api';
import { VoiceRecorder, type VoiceRecorderValue } from '../../../components/VoiceRecorder';
import { revalidateKinloomData } from '../../../actions';

type Props = {
  kinloom: KinloomDetail;
  canEdit: boolean;
  canDelete: boolean;
  /** True for a draft or final kinloom of yours that can go to a room. */
  canPublish: boolean;
};

export default function KinloomActions({
  kinloom,
  canEdit,
  canDelete,
  canPublish,
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

  if (!canEdit && !canDelete && !canPublish) return null;

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
          {canPublish && (
            <Link
              href={`/create/publish?k=${kinloom.id}`}
              role="menuitem"
              className="kinloom-menu__item"
              onClick={() => setMenuOpen(false)}
            >
              {kinloom.status === 'draft' ? 'Finish & publish' : 'Who can see it'}
            </Link>
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
          kinloom={kinloom}
          onCancel={() => setEditOpen(false)}
          onSaved={async () => {
            setEditOpen(false);
            await revalidateKinloomData(kinloom.id);
            router.refresh();
          }}
        />
      )}

      {deleteOpen && (
        <DeleteKinloomModal
          kinloomId={kinloom.id}
          onCancel={() => setDeleteOpen(false)}
          onDeleted={async () => {
            await revalidateKinloomData(kinloom.id);
            router.replace('/vault');
          }}
        />
      )}
    </div>
  );
}

// ─── Edit modal ─────────────────────────────────────────────────────

type ExistingPhoto = {
  key: string;
  url: string;
  mediaId: string;
  isVideo: boolean;
  removed: boolean;
};

type NewPhoto = {
  key: string;
  file: File;
  previewUrl: string;
  width: number | null;
  height: number | null;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
};

function initialExistingPhotos(kinloom: KinloomDetail): ExistingPhoto[] {
  return kinloom.media
    .filter(m => m.type === 'image' || m.type === 'video')
    .map(m => ({
      key: m.id,
      url: m.url,
      mediaId: m.id,
      isVideo: isVideoMedia(m),
      removed: false,
    }));
}

/** Order-independent equality for two lists of member ids. */
function sameIdSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every(id => set.has(id));
}

/** Map a failed edit request to a human message. */
function editErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.status) {
      case 403: return 'You don’t have permission to edit this kinloom.';
      case 404: return 'This kinloom no longer exists. It may have been deleted.';
      case 422: return err.firstFieldError() || err.message || 'Please check your changes and try again.';
      case 429: return 'You’re making changes too quickly. Wait a moment and try again.';
      default: return err.message || 'Could not save changes.';
    }
  }
  if (err instanceof Error && err.message) return err.message;
  return 'Could not save changes.';
}

function EditKinloomModal({
  kinloom,
  onCancel,
  onSaved,
}: {
  kinloom: KinloomDetail;
  onCancel: () => void;
  onSaved: () => void | Promise<void>;
}) {
  // Snapshot the original values once so we can send only what changed on
  // save (the API takes a partial PATCH).
  const initial = useRef({
    title: kinloom.title || '',
    body: kinloom.body ?? '',
    tagged: kinloom.tags.map(t => t.id),
    audioId: kinloom.media.find(m => m.type === 'audio')?.id ?? null,
  }).current;
  const hasAudio = initial.audioId !== null;

  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  const [tagged, setTagged] = useState<string[]>(initial.tagged);
  const [taggableMembers, setTaggableMembers] = useState<TaggableMember[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<ExistingPhoto[]>(() => initialExistingPhotos(kinloom));
  const [newPhotos, setNewPhotos] = useState<NewPhoto[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [removeAudio, setRemoveAudio] = useState(false);
  const [voiceValue, setVoiceValue] = useState<VoiceRecorderValue | null>(null);
  const [showVoicePicker, setShowVoicePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const newPhotosRef = useRef<NewPhoto[]>([]);

  useEffect(() => {
    newPhotosRef.current = newPhotos;
  }, [newPhotos]);

  useEffect(() => {
    return () => {
      newPhotosRef.current.forEach(p => URL.revokeObjectURL(p.previewUrl));
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ctx = await getCreateContext(kinloom.type.slug);
        if (!cancelled) setTaggableMembers(ctx.taggableMembers);
      } catch {
        if (!cancelled) setTaggableMembers([]);
      }
    })();
    return () => { cancelled = true; };
  }, [kinloom.type.slug]);

  const keptExisting = useMemo(
    () => existingPhotos.filter(p => !p.removed),
    [existingPhotos],
  );
  const photoCount = keptExisting.length + newPhotos.length;
  const canAddPhotos = photoCount < MAX_KINLOOM_PHOTOS;
  const mediaDirty =
    existingPhotos.some(p => p.removed) ||
    newPhotos.length > 0 ||
    removeAudio ||
    voiceValue !== null;
  const toggleKin = (id: string) =>
    setTagged(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;

    const errors: string[] = [];
    const accepted: File[] = [];
    for (const file of files) {
      if (!(PHOTO_MIME_TYPES as readonly string[]).includes(file.type)) {
        errors.push(`\u201c${file.name}\u201d isn\u2019t a supported file type. Use JPG, PNG, GIF, or WebP.`);
        continue;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        errors.push(`\u201c${file.name}\u201d is too large. Max 10 MB per photo.`);
        continue;
      }
      accepted.push(file);
    }

    const remainingSlots = Math.max(MAX_KINLOOM_PHOTOS - photoCount, 0);
    const toAdd = accepted.slice(0, remainingSlots);
    if (accepted.length > toAdd.length) {
      errors.push(
        `You can add up to ${MAX_KINLOOM_PHOTOS} photos. ${accepted.length - toAdd.length} photo${accepted.length - toAdd.length === 1 ? '' : 's'} were not added.`,
      );
    }

    const items: NewPhoto[] = await Promise.all(toAdd.map(async (file) => {
      const { width, height } = await readImageDimensions(file);
      return {
        key: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        width,
        height,
        status: 'pending' as const,
      };
    }));

    if (items.length > 0) setNewPhotos(prev => [...prev, ...items]);
    setPhotoError(errors.length > 0 ? errors.join(' ') : null);
  };

  const removeNewPhoto = (key: string) => {
    setNewPhotos(prev => {
      const item = prev.find(p => p.key === key);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter(p => p.key !== key);
    });
    setPhotoError(null);
  };

  const toggleExistingPhoto = (key: string) => {
    setExistingPhotos(prev => prev.map(p => (
      p.key === key ? { ...p, removed: !p.removed } : p
    )));
    setPhotoError(null);
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please give it a title before saving.');
      return;
    }
    if (!body.trim()) {
      setError('Please write something before saving.');
      return;
    }
    setError(null);
    setPhotoError(null);

    const nextTitle = title.trim();
    const nextBody = body.trim();

    // Build a partial payload from only the fields the user changed.
    const payload: UpdateKinloomBody = {};
    if (nextTitle !== initial.title.trim()) payload.title = nextTitle;
    if (nextBody !== initial.body.trim()) payload.body = nextBody;
    if (!sameIdSet(tagged, initial.tagged)) payload.tagged_member_ids = tagged;

    // Nothing changed — close without hitting the API.
    if (Object.keys(payload).length === 0 && !mediaDirty) {
      await onSaved();
      return;
    }

    setSubmitting(true);
    try {
      // Treat 404 as success so retries after a partial save stay idempotent.
      const deleteOrGone = async (mediaId: string) => {
        try {
          await deleteMedia(mediaId);
        } catch (err) {
          if (!(err instanceof ApiError) || err.status !== 404) throw err;
        }
      };

      if (Object.keys(payload).length > 0) {
        await updateKinloom(kinloom.id, payload);
      }

      for (const photo of existingPhotos) {
        if (photo.removed) await deleteOrGone(photo.mediaId);
      }

      if (removeAudio && initial.audioId) {
        await deleteOrGone(initial.audioId);
      }

      for (const item of newPhotos) {
        if (item.status === 'done') continue;
        setNewPhotos(prev => prev.map(p =>
          p.key === item.key ? { ...p, status: 'uploading', error: undefined } : p,
        ));
        try {
          await uploadKinloomPhoto(kinloom.id, item.file, {
            width: item.width,
            height: item.height,
          });
          setNewPhotos(prev => prev.map(p =>
            p.key === item.key ? { ...p, status: 'done' } : p,
          ));
        } catch (err) {
          const msg = editErrorMessage(err);
          setNewPhotos(prev => prev.map(p =>
            p.key === item.key ? { ...p, status: 'error', error: msg } : p,
          ));
          throw err;
        }
      }

      if (voiceValue) {
        await uploadKinloomAudio(kinloom.id, voiceValue.file, {
          durationSeconds: voiceValue.durationSeconds,
        });
      }

      await onSaved();
    } catch (err) {
      setError(editErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const showRecorder = showVoicePicker || voiceValue !== null;
  const showExistingAudio = hasAudio && !removeAudio && !showRecorder;
  const showAudioRemoved = hasAudio && removeAudio && !showRecorder;

  return (
    <div
      className="modal-backdrop"
      onClick={e => { if (e.target === e.currentTarget && !submitting) onCancel(); }}
    >
      <form className="modal modal--wide" onSubmit={onSubmit}>
        <h3 className="modal-title">Edit kinloom</h3>
        <p className="modal-text">
          Update the title, words, photos and who it&apos;s for. Existing media stays unless you remove it.
        </p>

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
              rows={5}
              disabled={submitting}
            />
          </div>

          <div className="edit-photos">
            <p className="field-label">Photos</p>
            <div className="edit-photos__toolbar">
              <button
                type="button"
                className="btn-outline btn-outline--sm"
                onClick={() => photoInputRef.current?.click()}
                disabled={submitting || !canAddPhotos}
              >
                {photoCount > 0 ? 'Add more photos' : 'Add photos'}
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept={PHOTO_MIME_TYPES.join(',')}
                multiple
                className="visually-hidden"
                onChange={handlePhotoChange}
                disabled={submitting || !canAddPhotos}
              />
              <span className="edit-photos__hint">
                {photoCount}/{MAX_KINLOOM_PHOTOS}
              </span>
            </div>

            {(existingPhotos.length > 0 || newPhotos.length > 0) && (
              <div className="photo-grid">
                {existingPhotos.map(photo => (
                  <div
                    key={photo.key}
                    className={`photo-grid__item${photo.removed ? ' photo-grid__item--removed' : ''}`}
                  >
                    {photo.isVideo ? (
                      <video
                        src={photo.url}
                        className="photo-grid__img"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={photo.url} alt="" className="photo-grid__img" />
                    )}
                    <button
                      type="button"
                      onClick={() => toggleExistingPhoto(photo.key)}
                      className="photo-grid__remove"
                      aria-label={photo.removed ? 'Keep media' : 'Remove media'}
                      disabled={submitting}
                    >
                      {photo.removed ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      )}
                    </button>
                    <p className="photo-grid__name">
                      {photo.removed ? 'Will remove' : 'Current'}
                    </p>
                  </div>
                ))}
                {newPhotos.map(item => (
                  <div key={item.key} className="photo-grid__item">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.previewUrl} alt="" className="photo-grid__img" />
                    {item.status === 'uploading' && (
                      <div className="photo-grid__overlay" aria-hidden="true">
                        <span className="photo-grid__spinner" />
                      </div>
                    )}
                    {item.status === 'done' && (
                      <span className="photo-grid__badge photo-grid__badge--done" title="Uploaded">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      </span>
                    )}
                    {item.status === 'error' && (
                      <span className="photo-grid__badge photo-grid__badge--error" title={item.error || 'Upload failed'}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="8" x2="12" y2="13" /><circle cx="12" cy="16.5" r="0.5" fill="currentColor" /></svg>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeNewPhoto(item.key)}
                      className="photo-grid__remove"
                      aria-label={`Remove ${item.file.name}`}
                      disabled={submitting}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                    <p className="photo-grid__name">{item.file.name}</p>
                  </div>
                ))}
              </div>
            )}

            {photoError && <p className="form-status form-status--error">{photoError}</p>}
          </div>

          <div className="edit-voice">
            <p className="field-label">Voice</p>
            {showExistingAudio && (
              <div className="edit-voice__existing">
                <span>Voice recording attached</span>
                <div className="edit-voice__actions">
                  <button
                    type="button"
                    className="btn-outline btn-outline--sm"
                    onClick={() => { setRemoveAudio(true); setShowVoicePicker(true); }}
                    disabled={submitting}
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    className="btn-outline btn-outline--sm"
                    onClick={() => { setRemoveAudio(true); setVoiceValue(null); setShowVoicePicker(false); }}
                    disabled={submitting}
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
            {showAudioRemoved && (
              <div className="edit-voice__existing">
                <span>Voice will be removed</span>
                <div className="edit-voice__actions">
                  <button
                    type="button"
                    className="btn-outline btn-outline--sm"
                    onClick={() => setShowVoicePicker(true)}
                    disabled={submitting}
                  >
                    Add new
                  </button>
                  <button
                    type="button"
                    className="btn-outline btn-outline--sm"
                    onClick={() => { setRemoveAudio(false); setShowVoicePicker(false); }}
                    disabled={submitting}
                  >
                    Undo
                  </button>
                </div>
              </div>
            )}
            {showRecorder && (
              <VoiceRecorder
                value={voiceValue}
                onChange={(next) => {
                  setVoiceValue(next);
                  if (next) setRemoveAudio(true);
                  if (!next && removeAudio && hasAudio) setShowVoicePicker(false);
                }}
                disabled={submitting}
              />
            )}
            {!hasAudio && !showRecorder && (
              <button
                type="button"
                className="btn-outline btn-outline--sm"
                onClick={() => setShowVoicePicker(true)}
                disabled={submitting}
              >
                Add voice
              </button>
            )}
          </div>

          <div>
            <p className="field-label">Who can see it</p>
            <p className="modal-text">
              Set when you publish.{' '}
              <Link href={`/create/publish?k=${kinloom.id}`} className="link-back">
                {kinloom.status === 'draft' ? 'Finish & publish' : 'Change who can see it'}
              </Link>
            </p>
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
  kinloomId,
  onCancel,
  onDeleted,
}: {
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
      await deleteKinloom(kinloomId);
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
          This permanently removes the kinloom, its media, and everywhere it was published, with its comments and holds. This cannot be undone.
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
