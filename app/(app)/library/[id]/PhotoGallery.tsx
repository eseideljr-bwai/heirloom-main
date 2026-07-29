'use client';

import { useEffect, useLayoutEffect, useRef, useState, type TouchEvent } from 'react';
import { isVideoMediaUrl, type KinloomMedia } from '../../../../lib/kinloom';

/** Tiles per page until the grid has been measured. Matches the 3-up desktop column count. */
const FALLBACK_PER_PAGE = 3;

/** Horizontal travel, in px, before a touch counts as a page swipe. */
const SWIPE_THRESHOLD = 40;

// The page size has to match the grid's column count so a page is exactly one row, and
// that count is decided by CSS (`auto-fill`). Reading it after layout but before paint
// keeps CSS the single source of truth and avoids a visible reflow on hydration.
const useMeasureEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

function readColumnCount(grid: HTMLElement): number {
  const tracks = window.getComputedStyle(grid).gridTemplateColumns;
  if (!tracks || tracks === 'none') return FALLBACK_PER_PAGE;
  return Math.max(1, tracks.split(' ').filter(Boolean).length);
}

const ChevronLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
);

const ChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
);

/**
 * Horizontal swipe detection. `swiped` lets a tap handler tell a real tap from the
 * click browsers still fire at the end of a horizontal drag.
 */
function useSwipe(onStep: (delta: 1 | -1) => void) {
  const origin = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);

  const handlers = {
    onTouchStart: (e: TouchEvent) => {
      const touch = e.touches[0];
      origin.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
      swiped.current = false;
    },
    onTouchEnd: (e: TouchEvent) => {
      const from = origin.current;
      const touch = e.changedTouches[0];
      origin.current = null;
      if (!from || !touch) return;
      const dx = touch.clientX - from.x;
      const dy = touch.clientY - from.y;
      if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) <= Math.abs(dy)) return;
      swiped.current = true;
      onStep(dx < 0 ? 1 : -1);
    },
  };

  return { handlers, swiped };
}

export default function PhotoGallery({ photos }: { photos: KinloomMedia[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [perPage, setPerPage] = useState(FALLBACK_PER_PAGE);
  const [page, setPage] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);
  // Absolute index of the first photo on the current page, so a resize that changes the
  // column count keeps the same photos in view instead of snapping back to page 1.
  const anchorRef = useRef(0);

  const totalPages = Math.max(1, Math.ceil(photos.length / perPage));

  const goToPage = (target: number) => {
    const next = Math.min(Math.max(target, 0), totalPages - 1);
    anchorRef.current = next * perPage;
    setPage(next);
  };

  const swipeGrid = useSwipe(delta => goToPage(page + delta));
  const swipeLightbox = useSwipe(delta =>
    setOpenIndex(i => (i === null ? i : (i + delta + photos.length) % photos.length)),
  );

  useMeasureEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const sync = () => {
      const columns = readColumnCount(grid);
      setPerPage(columns);
      setPage(Math.floor(anchorRef.current / columns));
    };
    sync();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(sync);
    observer.observe(grid);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setPage(p => Math.min(p, totalPages - 1));
  }, [totalPages]);

  // Keep the grid on the photo the lightbox is showing, so closing it lands you where
  // you left off rather than back on the page you opened from.
  useEffect(() => {
    if (openIndex === null) return;
    const target = Math.floor(openIndex / perPage);
    anchorRef.current = target * perPage;
    setPage(target);
  }, [openIndex, perPage]);

  // Warm the next page so paging forward doesn't wait on a fresh download.
  useEffect(() => {
    for (const photo of photos.slice((page + 1) * perPage, (page + 2) * perPage)) {
      if (photo.url && !isVideoMediaUrl(photo.url)) {
        const preload = new window.Image();
        preload.src = photo.url;
      }
    }
  }, [page, perPage, photos]);

  useEffect(() => {
    if (openIndex === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenIndex(null);
      if (e.key === 'ArrowRight') setOpenIndex(i => (i === null ? i : (i + 1) % photos.length));
      if (e.key === 'ArrowLeft') setOpenIndex(i => (i === null ? i : (i - 1 + photos.length) % photos.length));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openIndex, photos.length]);

  if (photos.length === 0) return null;

  const open = openIndex !== null ? photos[openIndex] : null;
  const openIsVideo = isVideoMediaUrl(open?.url);

  const first = page * perPage;
  const last = Math.min(first + perPage, photos.length);
  const isPaged = totalPages > 1;

  const rangeLabel = (target: number) => {
    const from = target * perPage + 1;
    const to = Math.min((target + 1) * perPage, photos.length);
    return from === to ? `Photo ${from}` : `Photos ${from}–${to}`;
  };

  return (
    <>
      <div
        className="detail-gallery-pager"
        onKeyDown={e => {
          if (openIndex !== null) return;
          if (e.key === 'ArrowRight') { e.preventDefault(); goToPage(page + 1); }
          if (e.key === 'ArrowLeft') { e.preventDefault(); goToPage(page - 1); }
        }}
      >
        <div
          ref={gridRef}
          className={`detail-gallery${photos.length === 1 ? ' detail-gallery--single' : ''}`}
          {...swipeGrid.handlers}
        >
          {photos.slice(first, last).map((photo, i) => {
            const index = first + i;
            if (!photo.url) return null;
            const isVideo = isVideoMediaUrl(photo.url);
            return (
              <button
                key={index}
                type="button"
                className="detail-gallery__tile"
                onClick={() => {
                  if (swipeGrid.swiped.current) return;
                  setOpenIndex(index);
                }}
                aria-label={
                  isVideo
                    ? `Play video ${index + 1} of ${photos.length}`
                    : `View photo ${index + 1} of ${photos.length}`
                }
              >
                {isVideo ? (
                  <video
                    src={photo.url}
                    className="detail-gallery__media"
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={photo.url} alt="" className="detail-gallery__media" />
                )}
              </button>
            );
          })}
        </div>

        {isPaged && (
          <>
            <nav className="detail-gallery-pager__nav" aria-label="Photo pages">
              <button
                type="button"
                className="detail-gallery-pager__arrow"
                onClick={() => goToPage(page - 1)}
                disabled={page === 0}
                aria-label="Previous photos"
              >
                <ChevronLeft />
              </button>

              <div className="detail-gallery-pager__dots">
                {Array.from({ length: totalPages }, (_, target) => (
                  <button
                    key={target}
                    type="button"
                    className={`detail-gallery-pager__dot${target === page ? ' is-current' : ''}`}
                    onClick={() => goToPage(target)}
                    aria-label={rangeLabel(target)}
                    aria-current={target === page ? 'true' : undefined}
                  />
                ))}
              </div>

              <button
                type="button"
                className="detail-gallery-pager__arrow"
                onClick={() => goToPage(page + 1)}
                disabled={page === totalPages - 1}
                aria-label="Next photos"
              >
                <ChevronRight />
              </button>
            </nav>
            <p className="visually-hidden" aria-live="polite">
              Showing {rangeLabel(page).toLowerCase()} of {photos.length}
            </p>
          </>
        )}
      </div>

      {open?.url && (
        <div
          className="detail-lightbox"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpenIndex(null)}
          {...swipeLightbox.handlers}
        >
          <button
            type="button"
            className="detail-lightbox__close"
            onClick={() => setOpenIndex(null)}
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          {photos.length > 1 && (
            <>
              <button
                type="button"
                className="detail-lightbox__nav detail-lightbox__nav--prev"
                onClick={(e) => { e.stopPropagation(); setOpenIndex(i => (i === null ? i : (i - 1 + photos.length) % photos.length)); }}
                aria-label="Previous"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
              </button>
              <button
                type="button"
                className="detail-lightbox__nav detail-lightbox__nav--next"
                onClick={(e) => { e.stopPropagation(); setOpenIndex(i => (i === null ? i : (i + 1) % photos.length)); }}
                aria-label="Next"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
              </button>
              <p className="detail-lightbox__count">{openIndex! + 1} / {photos.length}</p>
            </>
          )}
          {openIsVideo ? (
            <video
              key={open.url}
              src={open.url}
              className="detail-lightbox__img"
              controls
              playsInline
              autoPlay
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={open.url}
              alt=""
              className="detail-lightbox__img"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </>
  );
}
