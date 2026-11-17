'use client';

import { useCallback, useRef, useState } from 'react';
import { AVATAR_ACCEPT, avatarFileError } from '../../lib/avatar';
import { errorText } from '../../lib/settings';

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

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const invalid = avatarFileError(file);
    if (invalid) { setError(invalid); return; }
    void run('upload', () => onUpload(file));
  }

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept={AVATAR_ACCEPT}
      onChange={onChange}
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
