import type { LibraryRow } from '../../../../lib/kinloom';

export const FAMILY_FEED_PAGE_SIZE = 20;

/**
 * Oldest first, per the QA remediation task for the family feed. Rows
 * without a parseable `created_at` sink to the bottom rather than
 * poisoning the comparator with NaN.
 */
export function sortByOldestFirst(rows: LibraryRow[]): LibraryRow[] {
  const time = (row: LibraryRow) => {
    const parsed = new Date(row.created_at ?? '').getTime();
    return Number.isNaN(parsed) ? Infinity : parsed;
  };
  return [...rows].sort((a, b) => time(a) - time(b));
}
