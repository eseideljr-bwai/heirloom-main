import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getActiveSpaceId, getActiveSpace } from '../../../../lib/server/auth';
import { getFamilyTree } from '../../../../lib/server/queries';
import FamilyTreeClient from './FamilyTreeClient';

export const dynamic = 'force-dynamic';

export default async function FamilyTreePage() {
  const familySpaceId = await getActiveSpaceId();
  if (!familySpaceId) redirect('/onboarding/profile');

  const [tree, space] = await Promise.all([
    getFamilyTree(familySpaceId),
    getActiveSpace(),
  ]);
  const memberCount = tree.nodes.length;

  return (
    <div className="tree-page">
      <div className="tree-page__back">
        <Link href="/family" className="link-back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          Family
        </Link>
      </div>

      <p className="eyebrow tree-page__eyebrow">Family tree</p>
      <h1 className="tree-page__title">
        {space?.name ? `The ${space.name} family.` : 'Your family tree.'}
      </h1>
      <p className="tree-page__sub">
        {memberCount} member{memberCount === 1 ? '' : 's'}
      </p>

      {memberCount > 0 ? (
        <FamilyTreeClient
          nodes={tree.nodes}
          parentEdges={tree.parentEdges}
          coupleEdges={tree.coupleEdges}
        />
      ) : (
        <div className="empty-card">
          <p className="empty-card__text">No family members yet.</p>
        </div>
      )}
    </div>
  );
}
