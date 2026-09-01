import Link from 'next/link';
import { requireActiveSpaceId } from '../../../../lib/server/auth';
import { getFamilyFeed } from '../../../../lib/server/queries';
import { paginate, parsePageParam } from '../../../../lib/pagination';
import Pagination from '../../../components/Pagination';
import { FAMILY_FEED_PAGE_SIZE, sortByOldestFirst } from './constants';
import FamilyKinloomsList from './FamilyKinloomsList';

export const dynamic = 'force-dynamic';

type Search = { page?: string };

export default async function FamilyFeedPage({ searchParams }: { searchParams?: Search }) {
  const familySpaceId = await requireActiveSpaceId();

  const { kinlooms } = await getFamilyFeed(familySpaceId);
  const sorted = sortByOldestFirst(kinlooms);
  const { items, page, totalPages } = paginate(
    sorted,
    parsePageParam(searchParams?.page),
    FAMILY_FEED_PAGE_SIZE,
  );

  // The API's `totals` counts the whole space (including the caller's own and
  // private kinlooms the feed omits), so it disagrees with the list below
  // (QA UI-06). Count what we actually render instead.
  const total = sorted.length;
  const contributors = new Set(
    sorted.map(k => k.author?.member_id).filter(Boolean),
  ).size;

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
        {total} kinloom{total === 1 ? '' : 's'} from {contributors} family member{contributors === 1 ? '' : 's'}.
      </p>

      <div className="feed-section" id="family-kinlooms">
        <h2 className="feed-section__title">Kinlooms from your family</h2>
        <p className="feed-section__sub">Stories, lessons, and wisdom shared by your family members.</p>
        <FamilyKinloomsList items={items} />
        <Pagination
          page={page}
          totalPages={totalPages}
          basePath="/family/feed"
          hash="family-kinlooms"
          totalItems={sorted.length}
          pageSize={FAMILY_FEED_PAGE_SIZE}
          label="Family kinlooms pages"
        />
      </div>
    </div>
  );
}
