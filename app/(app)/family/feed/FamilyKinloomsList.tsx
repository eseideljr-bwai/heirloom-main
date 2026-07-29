'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { formatKinloomDate, type KinloomAuthor, type LibraryRow } from '../../../../lib/kinloom';
import { fetchFamilyKinloomsPage } from './actions';

function Silhouette({ author, size = 36, idKey }: { author: KinloomAuthor; size?: number; idKey: string }) {
  const gender = author.gender || 'n';
  const tone = author.tone || '#a39376';
  const bg = tone + '22';
  return (
    <svg viewBox="0 0 80 80" width={size} height={size} aria-label={author.name} className="silhouette">
      <defs><clipPath id={`clip-feed-${idKey}`}><circle cx="40" cy="40" r="40" /></clipPath></defs>
      <g clipPath={`url(#clip-feed-${idKey})`}>
        <rect width="80" height="80" fill={bg} />
        <rect y="48" width="80" height="32" fill={tone} opacity="0.10" />
        {gender === 'f' && <ellipse cx="40" cy="34" rx="16" ry="18" fill={tone} opacity="0.38" />}
        <path d="M 8 80 C 8 60, 22 52, 40 52 C 58 52, 72 60, 72 80 Z" fill={tone} opacity="0.55" />
        <ellipse cx="40" cy="32" rx="12" ry={gender === 'f' ? 11 : 10} fill={tone} opacity="0.78" />
        {gender === 'm' && <path d="M 28 28 Q 40 16, 52 28 L 52 32 Q 40 26, 28 32 Z" fill={tone} opacity="0.55" />}
        {gender === 'f' && <path d="M 28 30 Q 28 18, 40 16 Q 52 18, 52 30 L 52 38 Q 50 30, 40 30 Q 30 30, 28 38 Z" fill={tone} opacity="0.45" />}
        <ellipse cx="34" cy="34" rx="3" ry="4" fill="#fff" opacity="0.10" />
      </g>
    </svg>
  );
}

function KinloomFeedCard({ k }: { k: LibraryRow }) {
  return (
    <Link href={`/library/${k.ulid}`} className="feed-card">
      {k.author && <Silhouette author={k.author} size={40} idKey={`feed-${k.ulid}`} />}
      <div className="feed-card__body">
        <div className="feed-card__meta">
          {k.author && <span className="feed-card__author">{k.author.name}</span>}
          <span className="feed-card__dot">·</span>
          {k.type_label && <span className="badge badge--sm">{k.type_label}</span>}
          {k.created_at && <span className="feed-card__date">{formatKinloomDate(k.created_at)}</span>}
        </div>
        <h3 className="feed-card__title">{k.title || 'Untitled'}</h3>
        {k.excerpt && <p className="feed-card__excerpt">{k.excerpt}</p>}
        <div className="feed-card__chips">
          {k.has_audio && (
            <span className="feed-card__chip">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="17" x2="12" y2="22"/></svg>
              Voice
            </span>
          )}
          {k.has_photo && (
            <span className="feed-card__chip">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
              Photo
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

type Props = {
  initialItems: LibraryRow[];
  initialHasMore: boolean;
};

export default function FamilyKinloomsList({ initialItems, initialHasMore }: Props) {
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);

  const loadMore = useCallback(() => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);
    setError('');

    void fetchFamilyKinloomsPage(items.length)
      .then(page => {
        setItems(prev => {
          const seen = new Set(prev.map(k => k.ulid));
          const next = page.items.filter(k => !seen.has(k.ulid));
          return next.length ? [...prev, ...next] : prev;
        });
        setHasMore(page.hasMore);
      })
      .catch(() => {
        setError('Could not load more kinlooms.');
      })
      .finally(() => {
        loadingRef.current = false;
        setLoading(false);
      });
  }, [hasMore, items.length]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) loadMore();
      },
      { rootMargin: '200px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  if (items.length === 0) {
    return (
      <div className="empty-card">
        <p className="empty-card__text">Nothing here yet.</p>
      </div>
    );
  }

  return (
    <>
      {items.map(k => <KinloomFeedCard key={k.ulid} k={k} />)}
      {error && <p className="feed-load-more feed-load-more--error" role="alert">{error}</p>}
      {hasMore && (
        <div ref={sentinelRef} className="feed-load-more" aria-live="polite">
          {loading ? 'Loading more…' : '\u00a0'}
        </div>
      )}
    </>
  );
}
