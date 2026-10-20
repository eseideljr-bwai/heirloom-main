import { getActiveSpace, requireActiveSpaceId } from '../../../../../lib/server/auth';
import { getLibraryServer } from '../../../../../lib/server/queries';
import { normalizeList, type KinloomMedia, type LibraryRow } from '../../../../../lib/kinloom';
import ManageTabs from '../../../../components/ManageTabs';
import FeaturedClient, { type Candidate } from '../../../home/manage/featured/FeaturedClient';
import { orNull } from '../../../../../lib/server/safe';

export const dynamic = 'force-dynamic';

function photoUrl(row: LibraryRow): string | null {
  const photos = normalizeList<KinloomMedia>(row.photos);
  return photos[0]?.url || row.photo?.url || null;
}

function kind(row: LibraryRow): Candidate['kind'] {
  if (row.has_audio) return 'voice';
  if (photoUrl(row) || row.has_photo) return 'photograph';
  return 'written';
}

export default async function FeaturedOnTapestryPage() {
  const familySpaceId = await requireActiveSpaceId();

  const [library, activeSpace] = await Promise.all([
    orNull(getLibraryServer(familySpaceId)),
    getActiveSpace(),
  ]);

  const kinlooms = library?.kinlooms ?? [];

  const spaceName = activeSpace?.name?.trim() || 'this Family Space';

  const candidates: Candidate[] = kinlooms.map(row => ({
    id: row.ulid,
    title: row.title || 'Untitled',
    by: row.author?.name || '',
    kind: kind(row),
    image: photoUrl(row),
  }));

  return (
    <div className="mg-page">
      <p className="eyebrow">Manage {spaceName}</p>
      <h1 className="mg-page__title">Featured on the Tapestry</h1>
      <ManageTabs scope="space" />
      <p className="feat-lead">
        Choose what the homes in this Family Space see first. Kinloom decides how
        it sits on the page.
      </p>

      <FeaturedClient
        candidates={candidates}
        homeName={spaceName}
        storageKey="kinloom-featured-space-v1"
      />
    </div>
  );
}
