/**
 * Server actions used as targets for `revalidatePath` after client-side
 * mutations. The mutations themselves still go through `lib/api.ts` →
 * `/api/proxy` (so the BFF attaches the Bearer); calling these actions
 * is the cheapest way to flush React Server Component caches for the
 * pages whose data may have shifted.
 *
 * Each helper takes only the path(s) that need invalidating. Keep them
 * coarse — over-invalidating an SSR page is fine; missing one shows
 * stale data.
 */

'use server';

import { revalidatePath } from 'next/cache';

const ALWAYS = ['/home', '/library', '/family', '/family/feed', '/family/tree', '/family/members'];

/** Invalidate every page that reads from kinloom data (create/edit/delete/hold). */
export async function revalidateKinloomData(kinloomId?: string): Promise<void> {
  for (const p of ALWAYS) revalidatePath(p);
  if (kinloomId) {
    revalidatePath(`/library/${kinloomId}`);
  } else {
    revalidatePath('/library/[id]', 'page');
  }
  revalidatePath('/family/[memberId]', 'page');
  revalidatePath('/legacy-bank');
  revalidatePath('/legacy-bank/[memberId]', 'page');
}

/** Invalidate family-overview / members / tree pages after a member or invite mutation. */
export async function revalidateFamilyData(): Promise<void> {
  revalidatePath('/family');
  revalidatePath('/family/feed');
  revalidatePath('/family/tree');
  revalidatePath('/family/members');
  revalidatePath('/family/[memberId]', 'page');
  revalidatePath('/home');
}

/** Invalidate the /settings tree after a profile / privacy / notifications mutation. */
export async function revalidateSettingsData(): Promise<void> {
  revalidatePath('/settings');
  revalidatePath('/settings/privacy');
  revalidatePath('/settings/notifications');
  revalidatePath('/settings/export');
  revalidatePath('/home');
}

/** Reset everything — used after switching family spaces or accepting an invite. */
export async function revalidateAllData(): Promise<void> {
  revalidatePath('/', 'layout');
}
