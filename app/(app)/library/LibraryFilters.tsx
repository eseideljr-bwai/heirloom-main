'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

type Props = { types: string[]; type: string; q: string };

export default function LibraryFilters({ types, type, q }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [query, setQuery] = useState(q);
  const [pending, startTransition] = useTransition();

  // Debounced URL update for the search input.
  useEffect(() => {
    const id = window.setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (query.trim()) next.set('q', query.trim());
      else next.delete('q');
      // A new result set invalidates the current page offset.
      next.delete('page');
      const search = next.toString();
      const url = `${pathname}${search ? `?${search}` : ''}`;
      startTransition(() => router.replace(url, { scroll: false }));
    }, 250);
    return () => window.clearTimeout(id);
    // We deliberately don't include `params` to avoid a feedback loop;
    // we only react to local input changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, pathname, router]);

  function applyType(next: string) {
    const sp = new URLSearchParams(params.toString());
    if (next === 'All') sp.delete('type');
    else sp.set('type', next);
    sp.delete('page');
    const search = sp.toString();
    startTransition(() =>
      router.replace(`${pathname}${search ? `?${search}` : ''}`, { scroll: false }),
    );
  }

  return (
    <>
      <div className="library-search">
        <span className="library-search__icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </span>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by title, words, or feeling..."
          className="library-search__input"
        />
        {pending && <span className="library-search__pending">...</span>}
      </div>

      <div className="library-filters">
        {['All', ...types].map(f => (
          <button
            key={f}
            type="button"
            onClick={() => applyType(f)}
            className={`chip-button${(type === f || (f === 'All' && !type)) ? ' is-active' : ''}`}
          >
            {f}
          </button>
        ))}
      </div>
    </>
  );
}
