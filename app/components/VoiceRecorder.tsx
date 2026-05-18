'use client';

/**
 * Inline voice recorder + audio file picker for the kinloom create flow.
 *
 * Why inline (vs. modal): keeps the user in the same compose context and
 * matches the photo-preview pattern right above it.
 *
 * Recording strategy:
 *   - Pick the first MIME from `RECORDER_MIME_CANDIDATES` the browser
 *     supports. We deliberately skip `audio/webm` because the API enum
 *     doesn't accept it.
 *   - Track elapsed seconds in a ticker (more reliable than reading
 *     blob.duration back, which is Infinity for some webm/ogg blobs).
 *   - Stop on user click → wrap the Blob in a File with a sane name.
 *
 * Browser support notes:
 *   - Safari & recent Chrome: `audio/mp4` → .m4a
 *   - Firefox:               `audio/ogg`  → .ogg
 *   - If none match, recording is disabled and we only show file upload.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AUDIO_MIME_TYPES,
  apiMimeForRecorder,
  extensionForAudioMime,
  MAX_UPLOAD_BYTES,
  RECORDER_MIME_CANDIDATES,
} from '../../lib/kinloom';

type RecState = 'idle' | 'requesting' | 'recording';

export type VoiceRecorderValue = {
  file: File;
  /** Seconds, tracked client-side; passed to the API confirm step. */
  durationSeconds: number | null;
};

type Props = {
  value: VoiceRecorderValue | null;
  onChange: (next: VoiceRecorderValue | null) => void;
  disabled?: boolean;
};

function pickRecorderMime(): string | null {
  if (typeof window === 'undefined') return null;
  if (typeof window.MediaRecorder === 'undefined') return null;
  return (
    RECORDER_MIME_CANDIDATES.find((m) =>
      window.MediaRecorder.isTypeSupported(m),
    ) ?? null
  );
}

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const ss = (s % 60).toString().padStart(2, '0');
  return `${m}:${ss}`;
}

export function VoiceRecorder({ value, onChange, disabled }: Props) {
  const [recState, setRecState] = useState<RecState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const tickRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manage object URL for the preview.
  useEffect(() => {
    if (!value) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(value.file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const clearTicker = () => {
    if (tickRef.current != null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  // Hard reset on unmount: kill the mic, stop recorder, drop ticker.
  useEffect(() => {
    return () => {
      clearTicker();
      try {
        recorderRef.current?.stop();
      } catch {
        // ignore
      }
      stopStream();
    };
  }, [stopStream]);

  const startRecording = async () => {
    setError(null);
    const mime = pickRecorderMime();
    if (!mime) {
      setError('Your browser can\u2019t record audio in a supported format. Upload a file instead.');
      return;
    }

    setRecState('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream, { mimeType: mime });
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        clearTicker();
        const finalDuration = Math.max(
          1,
          Math.round((Date.now() - startedAtRef.current) / 1000),
        );
        const apiMime = apiMimeForRecorder(mime);
        const blob = new Blob(chunksRef.current, { type: apiMime });
        const ext = extensionForAudioMime(mime);
        const file = new File([blob], `voice-${Date.now()}.${ext}`, {
          type: apiMime,
        });
        stopStream();
        setRecState('idle');
        setElapsed(0);
        if (file.size > MAX_UPLOAD_BYTES) {
          setError('Recording too large (max 500 MB).');
          return;
        }
        onChange({ file, durationSeconds: finalDuration });
      };

      recorder.onerror = (e) => {
        console.error('[VoiceRecorder] MediaRecorder error', e);
        setError('Recording failed. Please try again.');
        stopStream();
        setRecState('idle');
        clearTicker();
      };

      startedAtRef.current = Date.now();
      setElapsed(0);
      recorder.start(250);
      setRecState('recording');

      tickRef.current = window.setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 250);
    } catch (err) {
      stopStream();
      setRecState('idle');
      const msg =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Microphone access was denied.'
          : err instanceof DOMException && err.name === 'NotFoundError'
            ? 'No microphone was found on this device.'
            : err instanceof Error
              ? err.message
              : 'Could not start recording.';
      setError(msg);
    }
  };

  const stopRecording = () => {
    const r = recorderRef.current;
    if (r && r.state !== 'inactive') {
      r.stop();
    }
  };

  const handlePickFile = () => {
    setError(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    // Some browsers don't set a mime for .m4a — accept by extension too.
    const looksAccepted =
      (AUDIO_MIME_TYPES as readonly string[]).includes(file.type) ||
      /\.(mp3|wav|ogg|aac|m4a|mp4)$/i.test(file.name);

    if (!looksAccepted) {
      setError('Unsupported audio format. Try MP3, WAV, OGG, AAC, M4A, or MP4.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('Audio file too large. Max 500 MB.');
      return;
    }

    // Normalize the File type if it's missing/unknown so the API confirm
    // step gets one of the accepted MIMEs.
    let normalized = file;
    if (!(AUDIO_MIME_TYPES as readonly string[]).includes(file.type)) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const inferred =
        ext === 'mp3' ? 'audio/mpeg'
        : ext === 'wav' ? 'audio/wav'
        : ext === 'ogg' ? 'audio/ogg'
        : ext === 'aac' ? 'audio/aac'
        : ext === 'm4a' ? 'audio/x-m4a'
        : ext === 'mp4' ? 'audio/mp4'
        : null;
      if (inferred) {
        normalized = new File([file], file.name, { type: inferred });
      }
    }

    onChange({ file: normalized, durationSeconds: null });
  };

  const handleRemove = () => {
    setError(null);
    onChange(null);
  };

  const isRecording = recState === 'recording';
  const isRequesting = recState === 'requesting';
  const hasValue = value !== null;

  return (
    <div className="voice-recorder">
      {!hasValue && !isRecording && !isRequesting && (
        <div className="voice-recorder__row">
          <button
            type="button"
            onClick={startRecording}
            disabled={disabled}
            className="voice-btn voice-btn--primary"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" fill="currentColor" />
            </svg>
            Record voice
          </button>
          <button
            type="button"
            onClick={handlePickFile}
            disabled={disabled}
            className="voice-btn voice-btn--ghost"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12"/><path d="m6 9 6-6 6 6"/><path d="M5 21h14"/></svg>
            Upload audio file
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={`${AUDIO_MIME_TYPES.join(',')},audio/*`}
            onChange={handleFileChange}
            className="visually-hidden"
          />
        </div>
      )}

      {isRequesting && (
        <p className="voice-recorder__status">Requesting microphone…</p>
      )}

      {isRecording && (
        <div className="voice-recorder__recording">
          <button
            type="button"
            onClick={stopRecording}
            className="voice-recorder__stop"
            aria-label="Stop recording"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
          </button>
          <span className="voice-recorder__pulse" aria-hidden="true" />
          <span className="voice-recorder__time">{formatTime(elapsed)}</span>
          <span className="voice-recorder__hint">Recording… tap stop when finished</span>
        </div>
      )}

      {hasValue && value && previewUrl && (
        <div className="voice-recorder__preview">
          <audio src={previewUrl} controls className="voice-recorder__audio" />
          <div className="voice-recorder__meta">
            <p className="voice-recorder__filename">{value.file.name}</p>
            <p className="voice-recorder__sub">
              {value.durationSeconds != null && `${formatTime(value.durationSeconds)} · `}
              {(value.file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="voice-recorder__remove"
            aria-label="Remove voice"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}

      {error && <p className="voice-recorder__error">{error}</p>}
    </div>
  );
}
