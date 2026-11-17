/**
 * Page-slicing helpers for the list views.
 *
 * The API returns whole collections today (`/library` and `/family-feed`
 * take no page/cursor params and `/library`'s `next_cursor` is always
 * null), so these operate on arrays we already hold. When the backend
 * grows real cursor pagination, the call sites keep the same `?page=`
 * URL contract and only the fetch changes.
 */

export const PAGE_SIZE = 10;

export type Paged<T> = {
  items: T[];
  page: number;
  totalPages: number;
};

/** Coerce a raw `?page=` value to a 1-based page number. */
export function parsePageParam(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 1 ? parsed : 1;
}

/**
 * Slice `items` down to one page. An out-of-range page clamps to the last
 * one, so a `?page=` left over from a wider result set still renders rows
 * instead of an empty grid after a filter narrows the list.
 */
export function paginate<T>(
  items: T[],
  requestedPage: number,
  pageSize: number = PAGE_SIZE,
): Paged<T> {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page, totalPages };
}

/**
 * The page numbers to render, where `null` marks an elided run. Always keeps
 * the first page, the last page and the current page's neighbours, and pads
 * near the ends so the control doesn't change width as you walk through it.
 */
export function pageWindow(page: number, totalPages: number): (number | null)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const candidates = [1, totalPages, page - 1, page, page + 1];
  if (page <= 3) candidates.push(2, 3, 4);
  if (page >= totalPages - 2) {
    candidates.push(totalPages - 3, totalPages - 2, totalPages - 1);
  }

  const shown = candidates
    .filter((n, i) => n >= 1 && n <= totalPages && candidates.indexOf(n) === i)
    .sort((a, b) => a - b);

  return shown.flatMap((n, i) =>
    i > 0 && n - shown[i - 1] > 1 ? [null, n] : [n],
  );
}
