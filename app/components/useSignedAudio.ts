'use client';

import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { getMediaUrl } from '../../lib/kinloom';

/** Re-sign this long before `expires_at`, so a press near the edge doesn't hit a dead link. */
const EXPIRY_MARGIN_MS = 60_000;

/**
 * Keeps an `<audio>` element playable on a page left open past its signed
 * URL's ~30 minutes. The element starts on the rendered `src`; once that is
 * stale, a fresh URL from GET /media/{id}/url is set on the element directly,
 * keeping the position. React keeps rendering the original `src`, so it never
 * reloads the element behind the player's back.
 */
export function useSignedAudio(
  audioRef: RefObject<HTMLAudioElement>,
  { mediaId, src, expiresAt }: { mediaId: string; src: string; expiresAt: string | null },
) {
  const expiresAtRef = useRef(expiresAt);
  const recoveredRef = useRef(false);
  const swapRef = useRef<Promise<boolean> | null>(null);

  useEffect(() => {
    expiresAtRef.current = expiresAt;
    recoveredRef.current = false;
  }, [src, expiresAt]);

  const isStale = useCallback(() => {
    const t = Date.parse(expiresAtRef.current ?? '');
    return Number.isFinite(t) && Date.now() > t - EXPIRY_MARGIN_MS;
  }, []);

  const swap = useCallback((): Promise<boolean> => {
    swapRef.current ??= getMediaUrl(mediaId)
      .then(
        (fresh) => {
          const el = audioRef.current;
          if (!el) return false;
          const at = el.currentTime;
          expiresAtRef.current = fresh.expires_at;
          el.addEventListener(
            'loadedmetadata',
            () => {
              recoveredRef.current = false;
              if (at > 0) el.currentTime = at;
            },
            { once: true },
          );
          el.src = fresh.url;
          return true;
        },
        (err) => {
          console.error('[useSignedAudio] could not re-sign', mediaId, err);
          return false;
        },
      )
      .finally(() => { swapRef.current = null; });
    return swapRef.current;
  }, [audioRef, mediaId]);

  /** Start playback, re-signing first if the link has run out. */
  const play = useCallback(async () => {
    const el = audioRef.current;
    if (!el) return;
    if (isStale()) await swap();
    await el.play();
  }, [audioRef, isStale, swap]);

  /**
   * For the element's `error` event: re-signs once and resolves true when the
   * element has a fresh URL to try. False means the error is real.
   */
  const recover = useCallback(async () => {
    if (recoveredRef.current) return false;
    recoveredRef.current = true;
    return swap();
  }, [swap]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && audioRef.current?.paused && isStale()) void swap();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [audioRef, isStale, swap]);

  return { play, recover };
}
