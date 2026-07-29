'use client';

import { useEffect, useState } from 'react';
import type { KinloomMedia } from '../../../../lib/kinloom';

export default function PhotoGallery({ photos }: { photos: KinloomMedia[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

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

  return (
    <>
      <div className={`detail-gallery${photos.length === 1 ? ' detail-gallery--single' : ''}`}>
        {photos.map((photo, i) => (
          photo.url && (
            <button
              key={i}
              type="button"
              className="detail-gallery__tile"
              onClick={() => setOpenIndex(i)}
              aria-label={`View photo ${i + 1} of ${photos.length}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="" />
            </button>
          )
        ))}
      </div>

      {openIndex !== null && photos[openIndex]?.url && (
        <div
          className="detail-lightbox"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpenIndex(null)}
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
                aria-label="Previous photo"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
              </button>
              <button
                type="button"
                className="detail-lightbox__nav detail-lightbox__nav--next"
                onClick={(e) => { e.stopPropagation(); setOpenIndex(i => (i === null ? i : (i + 1) % photos.length)); }}
                aria-label="Next photo"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
              </button>
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[openIndex].url ?? undefined}
            alt=""
            className="detail-lightbox__img"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
