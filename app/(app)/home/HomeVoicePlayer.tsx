'use client';

import { useEffect, useRef, useState } from 'react';

/** Pseudo-waveform: the payload carries no samples, so the bars are decorative. */
const WAVE = Array.from({ length: 30 }, (_, j) => `${20 + Math.round(Math.abs(Math.sin((j + 5) * 1.7)) * 78)}%`);

function clock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** The Home's featured voice: the design's player, playing the real recording. */
export default function HomeVoicePlayer({
  src,
  durationSeconds,
  label,
}: {
  src: string;
  durationSeconds: number | null;
  label: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(durationSeconds ?? 0);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setTime(el.currentTime);
    const onMeta = () => {
      if (Number.isFinite(el.duration) && el.duration > 0) setDuration(el.duration);
    };
    const onEnd = () => { setPlaying(false); setTime(0); };
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('ended', onEnd);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('ended', onEnd);
    };
  }, []);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      el.pause();
      setPlaying(false);
    }
  };

  const played = duration > 0 ? time / duration : 0;

  return (
    <div className="home-voice__player">
      {/* preload=none: the home screen shouldn't pull audio nobody pressed play on. */}
      <audio ref={audioRef} src={src} preload="none" />
      <button
        type="button"
        className="home-voice__play"
        onClick={toggle}
        aria-label={playing ? `Pause ${label}` : `Play ${label}`}
      >
        {playing ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3" /></svg>
        )}
      </button>
      <span className="home-voice__wave" aria-hidden="true">
        {WAVE.map((h, i) => (
          <span
            key={i}
            className={`home-voice__bar${i / WAVE.length < played ? ' is-played' : ''}`}
            style={{ height: h }}
          />
        ))}
      </span>
      <span className="home-voice__dur">{duration > 0 ? clock(duration) : ''}</span>
    </div>
  );
}
