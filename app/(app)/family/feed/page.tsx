import Link from 'next/link';
import { requireActiveSpaceId } from '../../../../lib/server/auth';
import { getFamilyFeed } from '../../../../lib/server/queries';
import { FAMILY_FEED_PAGE_SIZE, sortByMostRecent } from './constants';
import FamilyKinloomsList from './FamilyKinloomsList';

export const dynamic = 'force-dynamic';

export default async function FamilyFeedPage() {
  const familySpaceId = await requireActiveSpaceId();

  const { kinlooms, totals } = await getFamilyFeed(familySpaceId);
  const sorted = sortByMostRecent(kinlooms);
  const initialItems = sorted.slice(0, FAMILY_FEED_PAGE_SIZE);
  const initialHasMore = sorted.length > FAMILY_FEED_PAGE_SIZE;

  return (
    <div className="feed-page">

      <div className="feed-page__back">
        <Link href="/family" className="link-back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          Family
        </Link>
      </div>

      <p className="eyebrow feed-page__eyebrow">Family kinlooms</p>
      <h1 className="feed-page__title">What your family has shared.</h1>
      <p className="feed-page__sub">
        {totals.kinlooms} kinloom{totals.kinlooms === 1 ? '' : 's'} from {totals.contributors} family member{totals.contributors === 1 ? '' : 's'}.
      </p>

      <div className="feed-section" id="family-kinlooms">
        <h2 className="feed-section__title">Kinlooms from your family</h2>
        <p className="feed-section__sub">Stories, lessons, and wisdom shared by your family members.</p>
        <FamilyKinloomsList
          initialItems={initialItems}
          initialHasMore={initialHasMore}
        />
      </div>
    </div>
  );
}
