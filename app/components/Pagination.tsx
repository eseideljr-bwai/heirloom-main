import Link from 'next/link';
import { PAGE_SIZE, pageWindow } from '../../lib/pagination';

type Props = {
  page: number;
  totalPages: number;
  /** Route the page links point at, e.g. `/library`. */
  basePath: string;
  /** Other query params to carry across page links, e.g. the library filters. */
  params?: Record<string, string | undefined>;
  /**
   * Fragment id to append, so paging a list that sits far down the page lands
   * on that list instead of the top of the document.
   */
  hash?: string;
  /** Total row count, used for the "Showing x-y of z" caption. */
  totalItems?: number;
  pageSize?: number;
  label?: string;
};

function buildHref(
  basePath: string,
  params: Record<string, string | undefined>,
  hash: string | undefined,
  page: number,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  // Page 1 is the canonical bare URL.
  if (page > 1) search.set('page', String(page));
  const query = search.toString();
  return `${basePath}${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`;
}

export default function Pagination({
  page,
  totalPages,
  basePath,
  params = {},
  hash,
  totalItems,
  pageSize = PAGE_SIZE,
  label = 'Pagination',
}: Props) {
  if (totalPages <= 1) return null;

  const href = (target: number) => buildHref(basePath, params, hash, target);
  const firstRow = (page - 1) * pageSize + 1;
  const lastRow = totalItems == null ? 0 : Math.min(page * pageSize, totalItems);

  return (
    <nav className="pagination" aria-label={label}>
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev" className="pagination__step">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          Previous
        </Link>
      ) : (
        <span className="pagination__step is-disabled">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          Previous
        </span>
      )}

      <ol className="pagination__pages">
        {pageWindow(page, totalPages).map((n, i) =>
          n === null ? (
            <li key={`gap-${i}`} className="pagination__gap" aria-hidden="true">…</li>
          ) : (
            <li key={n}>
              {n === page ? (
                <span className="pagination__page is-current" aria-current="page">{n}</span>
              ) : (
                <Link href={href(n)} className="pagination__page" aria-label={`Page ${n}`}>{n}</Link>
              )}
            </li>
          ),
        )}
      </ol>

      {page < totalPages ? (
        <Link href={href(page + 1)} rel="next" className="pagination__step">
          Next
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
        </Link>
      ) : (
        <span className="pagination__step is-disabled">
          Next
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
        </span>
      )}

      {totalItems != null && (
        <p className="pagination__meta">
          Showing {firstRow}–{lastRow} of {totalItems}
        </p>
      )}
    </nav>
  );
}
