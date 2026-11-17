/**
 * Featured-on-the-Tapestry mutations (Space owner only). The editor's reads
 * come from `GET /family-spaces/{id}/featured` and `…/featured/candidates` on
 * the server; the Tapestry itself shows the result in its `featured` block.
 */

import { kinloomApi } from './kinloom-api';
import type { components } from './api-schema/typed';

export type SpaceFeaturedSlotName = 'lead' | 'quote' | 'pins';
export type SpaceFeaturedPicks = Record<SpaceFeaturedSlotName, string[]>;
export type SpaceFeaturedEditor = components['schemas']['SpaceFeatured'];

/** PUT /family-spaces/{id}/featured: replaces every pick at once. `[]` = automatic. */
export function saveSpaceFeatured(spaceId: string, picks: SpaceFeaturedPicks): Promise<SpaceFeaturedEditor> {
  return kinloomApi.put('/family-spaces/{familySpace}/featured', {
    path: { familySpace: spaceId },
    body: picks,
  });
}

/** DELETE /family-spaces/{id}/featured: every slot shows its automatic choice again. */
export async function resetSpaceFeatured(spaceId: string): Promise<void> {
  await kinloomApi.delete('/family-spaces/{familySpace}/featured', { path: { familySpace: spaceId } });
}
