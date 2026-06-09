'use client';

/**
 * Custom audio player for kinloom voice recordings.
 *
 * Why custom (vs. `<audio controls>`):
 *   - Matches the sage / serif aesthetic of the rest of the app.
 *   - Lets us co-locate metadata (speaker name, transcript) in the same
 *     surface as the transport controls.
 *
 * Features:
 *   - Play / pause
 *   - Seekable progress bar (range input — keyboard + screen-reader
 *     accessible for free)
 *   - Current time / total duration
 *   - Skip ±10s
 *   - Falls back to a known `fallbackDurationSeconds` when the metadata
 *     reports Infinity (common with some GCS-served webm/ogg blobs).
 */

import { useEffect, useRef, useState } from 'react';

type Props = {
  src: string;
  /** Label above the controls, e.g. "Mira's voice". */
  title?: string;
  /** Optional transcript shown below the title. */
  transcript?: string | null;
  /** Used when `audio.duration` is Infinity or NaN. */
  fallbackDurationSeconds?: number | null;
  onError?: (err: unknown) => void;
};

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const ss = (s % 60).toString().padStart(2, '0');
  return `${m}:${ss}`;
}

export function AudioPlayer({
  src,
  title,
  transcript,
  fallbackDurationSeconds,
  onError,
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number>(0);
  const [scrubbing, setScrubbing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Reset state when the source changes.
  useEffect(() => {
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setLoadError(null);
  }, [src]);

  const resolvedDuration =
    Number.isFinite(duration) && duration > 0
      ? duration
      : (fallbackDurationSeconds && fallbackDurationSeconds > 0
          ? fallbackDurationSeconds
          : 0);

  const handlePlayPause = async () => {
    const a = audioRef.current;
    if (!a) return;
    try {
      if (a.paused) {
        await a.play();
      } else {
        a.pause();
      }
    } catch (err) {
      console.error('[AudioPlayer] play failed', err);
      onError?.(err);
    }
  };

  const handleSkip = (deltaSeconds: number) => {
    const a = audioRef.current;
    if (!a) return;
    const next = Math.max(0, Math.min(resolvedDuration || a.duration || 0, a.currentTime + deltaSeconds));
    a.currentTime = next;
    setCurrentTime(next);
  };

  const handleScrubInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setCurrentTime(value);
    setScrubbing(true);
  };

  const handleScrubCommit = (e: React.ChangeEvent<HTMLInputElement> | React.PointerEvent<HTMLInputElement> | React.KeyboardEvent<HTMLInputElement>) => {
    const a = audioRef.current;
    if (!a) return;
    const value = Number((e.target as HTMLInputElement).value);
    a.currentTime = value;
    setScrubbing(false);
  };

  const progressPct = resolvedDuration > 0
    ? Math.min(100, (currentTime / resolvedDuration) * 100)
    : 0;

  return (
    <div className="audio-player">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => {
          const d = (e.currentTarget as HTMLAudioElement).duration;
          if (Number.isFinite(d) && d > 0) setDuration(d);
        }}
        onDurationChange={(e) => {
          const d = (e.currentTarget as HTMLAudioElement).duration;
          if (Number.isFinite(d) && d > 0) setDuration(d);
        }}
        onTimeUpdate={(e) => {
          if (scrubbing) return;
          setCurrentTime((e.currentTarget as HTMLAudioElement).currentTime);
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrentTime(0);
        }}
        onError={(e) => {
          console.error('[AudioPlayer] load error', src, e);
          setLoadError('Audio could not be loaded.');
          onError?.(e);
        }}
      />

      {(title || transcript) && (
        <div className="audio-player__head">
          {title && <p className="audio-player__title">{title}</p>}
          {transcript && <p className="audio-player__transcript">{transcript}</p>}
        </div>
      )}

      <div className="audio-player__controls">
        <button
          type="button"
          onClick={() => handleSkip(-10)}
          className="audio-player__skip"
          aria-label="Skip back 10 seconds"
          disabled={!!loadError}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 17l-5-5 5-5"/>
            <path d="M18 17l-5-5 5-5"/>
          </svg>
        </button>

        <button
          type="button"
          onClick={handlePlayPause}
          className="audio-player__play"
          aria-label={playing ? 'Pause' : 'Play'}
          disabled={!!loadError}
        >
          {playing ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleSkip(10)}
          className="audio-player__skip"
          aria-label="Skip forward 10 seconds"
          disabled={!!loadError}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 17l5-5-5-5"/>
            <path d="M6 17l5-5-5-5"/>
          </svg>
        </button>

        <div className="audio-player__scrub">
          <div className="audio-player__track" aria-hidden="true">
            <div
              className="audio-player__progress"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={resolvedDuration || 0}
            step={0.1}
            value={currentTime}
            onChange={handleScrubInput}
            onPointerUp={handleScrubCommit}
            onKeyUp={handleScrubCommit}
            aria-label="Seek"
            className="audio-player__range"
            disabled={!!loadError || resolvedDuration <= 0}
          />
        </div>

        <span className="audio-player__time" aria-live="off">
          {formatTime(currentTime)} <span className="audio-player__time-sep">/</span> {formatTime(resolvedDuration)}
        </span>
      </div>

      {loadError && (
        <p className="audio-player__error">{loadError}</p>
      )}
    </div>
  );
}
