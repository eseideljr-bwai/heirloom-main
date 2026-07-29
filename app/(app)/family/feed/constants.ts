import type { LibraryRow } from '../../../../lib/kinloom';

export const FAMILY_FEED_PAGE_SIZE = 20;

/**
 * Newest first. The SSR first page and the load-more action must slice the
 * same ordering or offsets drift and rows get skipped, so both sort here.
 * Rows without a parseable `created_at` sink to the bottom rather than
 * poisoning the comparator with NaN.
 */
export function sortByMostRecent(rows: LibraryRow[]): LibraryRow[] {
  const time = (row: LibraryRow) => {
    const parsed = new Date(row.created_at ?? '').getTime();
    return Number.isNaN(parsed) ? -Infinity : parsed;
  };
  return [...rows].sort((a, b) => time(b) - time(a));
}
