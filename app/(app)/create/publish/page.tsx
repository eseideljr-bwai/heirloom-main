import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ApiError } from '../../../../lib/api';
import { requireHome } from '../../../../lib/server/auth';
import { serverKinloomApi } from '../../../../lib/server/kinloom-api';
import CreateSteps from '../../../components/CreateSteps';
import PublishSheet from './PublishSheet';

export const dynamic = 'force-dynamic';

/**
 * Step 3 of the create flow. Reached from the composer once a draft exists,
 * and from the Vault's "Publish…" action for an existing final kinloom.
 *
 * The rooms, who each can read, and where the kinloom is already published
 * all come from the API; the client never works out readers itself.
 */
export default async function PublishPage({
  searchParams,
}: {
  searchParams?: { k?: string };
}) {
  const kinloomId = searchParams?.k?.trim();
  if (!kinloomId) redirect('/create');

  // The three reads are independent of each other and of the session guard,
  // so they start together. The guard still runs first on the way out.
  const kinloomReq = serverKinloomApi
    .get('/kinlooms/{kinloom}', { path: { kinloom: kinloomId } })
    .then((data) => ({ data }), (error: unknown) => ({ error }));
  const publicationsReq = serverKinloomApi
    .get('/kinlooms/{kinloom}/publications', { path: { kinloom: kinloomId } })
    .then((data) => ({ data }), (error: unknown) => ({ error }));
  const settingsReq = serverKinloomApi
    .get('/me/settings')
    .then((data) => data.default_publish_target, () => 'home' as const);

  await requireHome();

  const [kinloomRes, publicationsRes, defaultTarget] = await Promise.all([
    kinloomReq,
    publicationsReq,
    settingsReq,
  ]);

  for (const res of [kinloomRes, publicationsRes]) {
    if ('error' in res) {
      if (res.error instanceof ApiError && res.error.status === 404) notFound();
      throw res.error;
    }
  }
  if ('error' in kinloomRes || 'error' in publicationsRes) notFound();

  const kinloom = kinloomRes.data;
  const publications = publicationsRes.data;
  const isDraft = publications.status === 'draft';

  return (
    <div className="pub-page">
      <Link
        href={isDraft ? `/create/${kinloom.type.slug}` : '/vault'}
        className="create-page__back"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
        </svg>
        {isDraft ? 'Back to writing' : 'Back to Vault'}
      </Link>

      <CreateSteps active={2} mode="write" />

      <p className="eyebrow pub-page__eyebrow">{isDraft ? 'Saved to your Vault' : 'In your Vault'}</p>
      <h1 className="pub-page__title">Who should be able to read this?</h1>
      <p className="pub-page__lead">
        Publishing only adds an audience. Nothing ever leaves your vault.
      </p>

      <PublishSheet
        kinloomId={kinloomId}
        status={publications.status}
        typeLabel={kinloom.type.label}
        title={kinloom.title}
        rooms={publications.rooms}
        defaultTarget={defaultTarget}
      />
    </div>
  );
}
