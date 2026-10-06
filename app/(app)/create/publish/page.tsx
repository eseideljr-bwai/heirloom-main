import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getActiveSpace, requireActiveSpaceId } from '../../../../lib/server/auth';
import { getKinloomServer, getManageMembers } from '../../../../lib/server/queries';
import CreateSteps from '../../../components/CreateSteps';
import PublishSheet from './PublishSheet';

export const dynamic = 'force-dynamic';

/**
 * Step 3 of the create flow. Reached from the composer once a draft
 * exists, and — once publications land — reusable from the Vault's
 * "Publish elsewhere…" action against an existing kinloom.
 */
export default async function PublishPage({
  searchParams,
}: {
  searchParams?: { k?: string };
}) {
  const kinloomId = searchParams?.k?.trim();
  if (!kinloomId) redirect('/create');

  const familySpaceId = await requireActiveSpaceId();

  const [kinloom, activeSpace, members] = await Promise.all([
    getKinloomServer(familySpaceId, kinloomId).catch(() => null),
    getActiveSpace(),
    // Only source of a member count today; the Home entity will carry
    // its own once it exists.
    getManageMembers(familySpaceId).catch(() => null),
  ]);

  if (!kinloom) notFound();

  return (
    <div className="pub-page">
      <Link href={`/create/${kinloom.type_slug}`} className="create-page__back">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
        </svg>
        Back to writing
      </Link>

      <CreateSteps active={2} mode="write" />

      <p className="eyebrow pub-page__eyebrow">Saved to your Vault</p>
      <h1 className="pub-page__title">Who should be able to read this?</h1>
      <p className="pub-page__lead">
        Publishing only adds an audience. Nothing ever leaves your vault.
      </p>

      <PublishSheet
        kinloomId={kinloomId}
        familySpaceId={familySpaceId}
        typeLabel={kinloom.type_label}
        title={kinloom.title}
        homeName={activeSpace?.name?.trim() || 'your Family Home'}
        homeMemberCount={members ? members.members.length : null}
        // Onward publication has no endpoint yet, so there is nothing
        // truthful to list here. The sheet renders the group either way.
        spaces={[]}
      />
    </div>
  );
}
