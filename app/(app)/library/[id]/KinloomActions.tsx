'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  cloneKinloomWithMedia,
  deleteKinloom,
  deleteMediaAttachment,
  getCreateContext,
  isVideoMediaUrl,
  MAX_KINLOOM_PHOTOS,
  MAX_PHOTO_BYTES,
  normalizeList,
  PHOTO_MIME_TYPES,
  readImageDimensions,
  updateKinloom,
  uploadKinloomAudio,
  uploadKinloomPhoto,
  type Kinloom,
  type KinloomMedia,
  type UpdateKinloomPayload,
  type Visibility,
  type TaggableMember,
} from '../../../../lib/kinloom';
import { resolveMediaAttachmentId } from '../../../../lib/media-attachments';
import { ApiError } from '../../../../lib/api';
import { VoiceRecorder, type VoiceRecorderValue } from '../../../components/VoiceRecorder';
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
          onSaved={async (nextId) => {
            setEditOpen(false);
            const id = nextId || kinloom.ulid;
            await revalidateKinloomData(kinloom.ulid);
            if (nextId && nextId !== kinloom.ulid) {
              await revalidateKinloomData(nextId);
              router.replace(`/library/${nextId}`);
              return;
            }
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

type ExistingPhoto = {
  key: string;
  url: string;
  mediaId: string | null;
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

function initialExistingPhotos(kinloom: Kinloom): ExistingPhoto[] {
  const listed = normalizeList<KinloomMedia>(kinloom.photos).filter(p => !!p?.url);
  const source = listed.length > 0
    ? listed
    : (kinloom.photo?.url ? [kinloom.photo] : []);
  return source.map((p, i) => {
    const mediaId = resolveMediaAttachmentId(p);
    return {
      key: mediaId ?? `existing-${i}-${p.url}`,
      url: p.url as string,
      mediaId,
      removed: false,
    };
  });
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
  familySpaceId,
  kinloom,
  onCancel,
  onSaved,
}: {
  familySpaceId: string;
  kinloom: Kinloom;
  onCancel: () => void;
  /** Optional new ulid when media edits required a republish. */
  onSaved: (nextId?: string) => void | Promise<void>;
}) {
  // Snapshot the original values once so we can send only what changed on
  // save. This is deliberate: `kinloom.show` returns no raw `body` (only
  // `body_paragraphs`), so `bodyToText` reconstructs it lossily. Sending
  // that reconstruction on every save — even a title-only edit — would
  // rewrite the stored body through the lossy path. Dirty-tracking means
  // `body` is only sent when the user actually edited it. (Backend ask:
  // add raw `body` to the show response to remove the lossiness entirely.)
  const initial = useRef({
    title: kinloom.title || '',
    body: bodyToText(kinloom.body_paragraphs),
    visibility: ((kinloom.visibility as Visibility) || 'family') as Visibility,
    tagged: taggedIds(kinloom.tagged_kin),
    hasAudio: !!kinloom.audio?.url,
    audioUrl: kinloom.audio?.url ?? null,
    audioId: resolveMediaAttachmentId(kinloom.audio),
  }).current;

  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  const [visibility, setVisibility] = useState<Visibility>(initial.visibility);
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
        const ctx = await getCreateContext(familySpaceId, kinloom.type_slug);
        if (!cancelled) setTaggableMembers(ctx.taggableMembers);
      } catch {
        if (!cancelled) setTaggableMembers([]);
      }
    })();
    return () => { cancelled = true; };
  }, [familySpaceId, kinloom.type_slug]);

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
  // show omits MediaAttachment ids; when a removal has no resolvable id we
  // republish into a new kinloom row (same content + kept/new media).
  const needsRepublish =
    existingPhotos.some(p => p.removed && !p.mediaId) ||
    (removeAudio && !!initial.hasAudio && !initial.audioId);

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
    const payload: UpdateKinloomPayload = {};
    if (nextTitle !== initial.title.trim()) payload.title = nextTitle;
    if (nextBody !== initial.body.trim()) payload.body = nextBody;
    if (visibility !== initial.visibility) payload.visibility = visibility;
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
          await deleteMediaAttachment(familySpaceId, mediaId);
        } catch (err) {
          if (!(err instanceof ApiError) || err.status !== 404) throw err;
        }
      };

      if (needsRepublish) {
        // API show omits attachment ids, so remove/replace of pre-existing
        // media requires cloning into a new row with the desired media set.
        const published = await cloneKinloomWithMedia(familySpaceId, kinloom, {
          title: nextTitle,
          body: nextBody,
          visibility,
          tagged_member_ids: tagged,
          keptPhotoUrls: keptExisting.map(p => p.url),
          newPhotos: newPhotos.map(p => ({
            file: p.file,
            width: p.width,
            height: p.height,
          })),
          keepAudioUrl: (!removeAudio && !voiceValue && initial.audioUrl) ? initial.audioUrl : null,
          newAudio: voiceValue
            ? { file: voiceValue.file, durationSeconds: voiceValue.durationSeconds }
            : null,
        });
        try {
          await deleteKinloom(familySpaceId, kinloom.ulid);
        } catch (err) {
          // New kinloom is live; surface cleanup failure but still navigate.
          console.error('Failed to delete replaced kinloom', err);
        }
        await onSaved(published.ulid);
        return;
      }

      // Fast path: text patch + delete-by-id + additive uploads.
      if (Object.keys(payload).length > 0) {
        await updateKinloom(familySpaceId, kinloom.ulid, payload);
      }

      for (const photo of existingPhotos) {
        if (!photo.removed || !photo.mediaId) continue;
        await deleteOrGone(photo.mediaId);
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
          await uploadKinloomPhoto(familySpaceId, kinloom.ulid, item.file, {
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
        // Replace: drop prior audio first when we have its attachment id.
        if (initial.audioId && !removeAudio) {
          await deleteOrGone(initial.audioId);
        }
        await uploadKinloomAudio(familySpaceId, kinloom.ulid, voiceValue.file, {
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
  const showExistingAudio = initial.hasAudio && !removeAudio && !showRecorder;
  const showAudioRemoved = initial.hasAudio && removeAudio && !showRecorder;

  return (
    <div
      className="modal-backdrop"
      onClick={e => { if (e.target === e.currentTarget && !submitting) onCancel(); }}
    >
      <form className="modal modal--wide" onSubmit={onSubmit}>
        <h3 className="modal-title">Edit kinloom</h3>
        <p className="modal-text">
          Update the title, words, photos, who it&apos;s for, and who can see it. Existing media stays unless you remove it.
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
                    {isVideoMediaUrl(photo.url) ? (
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
                  if (!next && removeAudio && initial.hasAudio) setShowVoicePicker(false);
                }}
                disabled={submitting}
              />
            )}
            {!initial.hasAudio && !showRecorder && (
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
