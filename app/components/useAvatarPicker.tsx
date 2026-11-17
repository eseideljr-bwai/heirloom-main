'use client';

import { useCallback, useRef, useState } from 'react';
import { AVATAR_ACCEPT, avatarFileError } from '../../lib/avatar';
import { errorText } from '../../lib/settings';
import { HEIC_ACCEPT, normalizeImageFile } from '../../lib/image-normalize';

/**
 * One click to choose a photo, then it uploads straight away: no crop step
 * (the server makes the square). `input` must be rendered somewhere; `open`
 * is what a button calls. The caller decides what upload and remove mean.
 */
export function useAvatarPicker({
  onUpload,
  onRemove,
}: {
  onUpload: (file: File) => Promise<void>;
  onRemove?: () => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<'upload' | 'remove' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const clearError = useCallback(() => setError(null), []);

  async function run(kind: 'upload' | 'remove', task: () => Promise<void>) {
    setBusy(kind);
    setError(null);
    try {
      await task();
    } catch (err) {
      setError(errorText(err, kind === 'upload' ? 'Could not upload the photo. Try again.' : 'Could not remove the photo.'));
    } finally {
      setBusy(null);
    }
  }

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    e.target.value = '';
    if (!picked) return;
    // HEIC/HEIF → JPEG first (busy meanwhile, so it can't be picked twice).
    setBusy('upload');
    setError(null);
    let file: File;
    try {
      file = await normalizeImageFile(picked);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that photo.');
      setBusy(null);
      return;
    }
    const invalid = avatarFileError(file);
    if (invalid) { setError(invalid); setBusy(null); return; }
    void run('upload', () => onUpload(file));
  }

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept={`${AVATAR_ACCEPT},${HEIC_ACCEPT}`}
      onChange={e => void onChange(e)}
      hidden
      tabIndex={-1}
      aria-hidden="true"
    />
  );

  return {
    input,
    busy,
    error,
    clearError,
    open: () => { if (!busy) inputRef.current?.click(); },
    remove: onRemove ? () => { if (!busy) void run('remove', onRemove); } : undefined,
  };
}
