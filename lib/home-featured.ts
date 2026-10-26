/**
 * Featured-on-Home mutations (owner and co-owner). The editor's reads come
 * from `GET /family-homes/{id}/featured` and `…/featured/candidates` on the
 * server; the Home itself shows the result in its `featured` block.
 */

import { kinloomApi } from './kinloom-api';
import type { components } from './api-schema/typed';

export type FeaturedSlotName = 'hero' | 'quote' | 'voice' | 'lately';
export type FeaturedPicks = Record<FeaturedSlotName, string[]>;
export type HomeFeaturedEditor = components['schemas']['HomeFeaturedEditor'];

/** PUT /family-homes/{id}/featured: replaces every pick at once. `[]` = automatic. */
export function saveHomeFeatured(homeId: string, picks: FeaturedPicks): Promise<HomeFeaturedEditor> {
  return kinloomApi.put('/family-homes/{familyHome}/featured', {
    path: { familyHome: homeId },
    body: picks,
  });
}

/** DELETE /family-homes/{id}/featured: every slot shows its automatic choice again. */
export async function resetHomeFeatured(homeId: string): Promise<void> {
  await kinloomApi.delete('/family-homes/{familyHome}/featured', { path: { familyHome: homeId } });
}
