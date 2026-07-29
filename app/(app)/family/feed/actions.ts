'use server';

import { requireActiveSpaceId } from '../../../../lib/server/auth';
import { getFamilyFeed } from '../../../../lib/server/queries';
import type { LibraryRow } from '../../../../lib/kinloom';
import { FAMILY_FEED_PAGE_SIZE, sortByMostRecent } from './constants';

/**
 * One page of family kinlooms, newest first. `/family-feed` has no page or
 * cursor params, so this re-slices the whole collection per call; swap the
 * fetch for a paginated one here when the API grows it.
 */
export async function fetchFamilyKinloomsPage(offset: number): Promise<{
  items: LibraryRow[];
  hasMore: boolean;
}> {
  const familySpaceId = await requireActiveSpaceId();
  const { kinlooms } = await getFamilyFeed(familySpaceId);

  const sorted = sortByMostRecent(kinlooms);
  const start = Number.isFinite(offset) ? Math.max(0, Math.trunc(offset)) : 0;
  const items = sorted.slice(start, start + FAMILY_FEED_PAGE_SIZE);

  return { items, hasMore: start + items.length < sorted.length };
}
