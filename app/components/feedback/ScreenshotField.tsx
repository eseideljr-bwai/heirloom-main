'use client';

import { useId, useRef, useState } from 'react';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp']);

export function ScreenshotField({
  value,
  onChange,
  disabled = false,
}: {
  value: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const hintId = useId();
  const [error, setError] = useState<string | null>(null);

  const pick = (file: File | null) => {
    if (!file) {
      setError(null);
      onChange(null);
      return;
    }
    if (!ALLOWED.has(file.type)) {
      setError('Use a PNG, JPEG, or WebP.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Screenshot must be 10MB or smaller.');
      return;
    }
    setError(null);
    onChange(file);
  };

  return (
    <div className="fb-field">
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="visually-hidden"
        disabled={disabled}
        onChange={e => pick(e.target.files?.[0] ?? null)}
      />
      <button
        type="button"
        className={`fb-attach${value ? ' has-file' : ''}`}
        disabled={disabled}
        aria-describedby={hintId}
        onClick={() => inputRef.current?.click()}
      >
        {value ? value.name : 'Attach a screenshot'}
      </button>
      {value && (
        <button
          type="button"
          className="fb-btn fb-btn--quiet"
          disabled={disabled}
          onClick={() => {
            if (inputRef.current) inputRef.current.value = '';
            pick(null);
          }}
        >
          Remove screenshot
        </button>
      )}
      <p className="fb-hint" id={hintId}>
        {error ?? 'PNG, JPEG, or WebP. Max 10MB.'}
      </p>
    </div>
  );
}
