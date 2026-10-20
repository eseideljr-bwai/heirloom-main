import { getActiveSpace, requireActiveSpaceId } from '../../../../../lib/server/auth';
import { getLibraryServer } from '../../../../../lib/server/queries';
import { normalizeList, type KinloomMedia, type LibraryRow } from '../../../../../lib/kinloom';
import ManageTabs from '../../../../components/ManageTabs';
import FeaturedClient, { type Candidate } from './FeaturedClient';
import { orNull } from '../../../../../lib/server/safe';

export const dynamic = 'force-dynamic';

function photoUrl(row: LibraryRow): string | null {
  const photos = normalizeList<KinloomMedia>(row.photos);
  return photos[0]?.url || row.photo?.url || null;
}

/** The media classification the design labels cards with. */
function kind(row: LibraryRow): Candidate['kind'] {
  if (row.has_audio) return 'voice';
  if (photoUrl(row) || row.has_photo) return 'photograph';
  return 'written';
}

export default async function FeaturedOnHomePage() {
  const familySpaceId = await requireActiveSpaceId();

  const [library, activeSpace] = await Promise.all([
    orNull(getLibraryServer(familySpaceId)),
    getActiveSpace(),
  ]);

  const kinlooms = library?.kinlooms ?? [];

  // [media-diag] TEMPORARY — prints to the dev-server terminal so we can
  // see what the library list actually returns. Remove once resolved.
  if (kinlooms.length > 0) {
    const r = kinlooms[0] as Record<string, unknown>;
    console.log('[media-diag] rows:', kinlooms.length);
    console.log('[media-diag] row[0] keys:', Object.keys(r).join(', '));
    console.log('[media-diag] has_photo rows:', kinlooms.filter(k => k.has_photo).length);
    console.log('[media-diag] rows where a url resolved:', kinlooms.filter(k => photoUrl(k)).length);
    const withFlag = kinlooms.find(k => k.has_photo);
    if (withFlag) {
      const w = withFlag as Record<string, unknown>;
      console.log('[media-diag] sample has_photo row:', JSON.stringify({
        ulid: w.ulid, title: w.title,
        photo: w.photo, photos: w.photos,
        has_photo: w.has_photo, has_audio: w.has_audio,
      }).slice(0, 900));
    }
  }

  const candidates: Candidate[] = kinlooms.map(row => ({
    id: row.ulid,
    title: row.title || 'Untitled',
    by: row.author?.name || '',
    kind: kind(row),
    image: photoUrl(row),
  }));

  return (
    <div className="mg-page">
      <p className="eyebrow">Manage your Family Home</p>
      <h1 className="mg-page__title">Featured on Home</h1>
      <ManageTabs />
      <p className="feat-lead">
        Choose what the people in your home see first. Kinloom decides how it
        sits on the page.
      </p>

      <FeaturedClient
        candidates={candidates}
        homeName={activeSpace?.name?.trim() || 'your Family Home'}
        storageKey="kinloom-featured-home-v1"
      />
    </div>
  );
}
