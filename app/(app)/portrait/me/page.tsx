import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getActiveSpace, requireActiveSpaceId } from '../../../../lib/server/auth';
import { getHome } from '../../../../lib/server/queries';

export const dynamic = 'force-dynamic';

/**
 * Resolves "me" to the viewer's own member id, server-side.
 *
 * The account menu is a client component and cannot build this link
 * itself: /me returns family_spaces without a member_id, so the current
 * user's member id is not obtainable in the browser. Every other
 * self-lookup in the app uses this same fallback chain, server-side.
 */
export default async function MyPortraitRedirect() {
  const familySpaceId = await requireActiveSpaceId();

  const [home, activeSpace] = await Promise.all([
    getHome(familySpaceId).catch(() => null),
    getActiveSpace(),
  ]);

  const memberId = home?.userSummary?.member_id || activeSpace?.member_id || null;
  if (memberId) redirect(`/portrait/${memberId}`);

  // Reachable when the API can't tell us which member we are. A 404 would
  // misdescribe that, so say what happened instead.
  return (
    <div className="stub-page">
      <p className="eyebrow">Portrait</p>
      <h1 className="stub-page__title">We couldn&rsquo;t find your member record.</h1>
      <p className="stub-page__blurb">
        Your Portrait lives on your member profile, and this family space
        didn&rsquo;t return one for you. Refreshing usually clears it.
      </p>
      <p className="stub-page__note">
        <Link href="/home">Back to My Home</Link>
      </p>
    </div>
  );
}
