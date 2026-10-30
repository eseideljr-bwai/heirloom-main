import { ApiError } from '../../../../../lib/api';
import { getActiveFamilySpaceId, requireHome } from '../../../../../lib/server/auth';
import { serverKinloomApi } from '../../../../../lib/server/kinloom-api';
import type { components } from '../../../../../lib/api-schema/typed';
import ManageTabs from '../../../../components/ManageTabs';
import NoFamilySpace from '../../../../components/NoFamilySpace';
import SpaceFeaturedClient, { type FeaturedCard, type SlotData } from './SpaceFeaturedClient';

export const dynamic = 'force-dynamic';

type Card = components['schemas']['KinloomCard'] & { home?: { name: string } | null };
type Slot = 'lead' | 'quote' | 'pins';
const SLOTS: Slot[] = ['lead', 'quote', 'pins'];

/** Candidate cards are not paged through here: the 50 most recent per slot. */
const CANDIDATES = 50;

function toCard(c: Card, quote: string | null = null, slot: Slot = 'pins'): FeaturedCard {
  const visual = c.has_video ? 'film' : c.has_photo ? 'photograph' : null;
  const kind: FeaturedCard['kind'] =
    slot === 'lead' ? visual ?? 'written' : visual ?? (c.has_audio ? 'voice' : 'written');
  return {
    id: c.id,
    title: c.title || 'Untitled',
    by: c.author.name,
    home: c.home?.name ?? null,
    kind,
    quote,
    image: c.thumbnail_url ?? null,
  };
}

/**
 * Featured on the Tapestry: what the Space's owner picks for the lead, the
 * quote and the pins. Picks, the automatic fallback and the eligible cards per
 * slot all come from the API; nothing is stored in the browser. Other members
 * get a plain explanation (403), since they see the result on the Tapestry.
 */
export default async function FeaturedOnTapestryPage() {
  await requireHome();
  const spaceId = await getActiveFamilySpaceId();
  if (!spaceId) return <NoFamilySpace what="Featured on the Tapestry" />;

  const [editorRes, manageRes, ...candidateRes] = await Promise.all([
    serverKinloomApi
      .get('/family-spaces/{familySpace}/featured', { path: { familySpace: spaceId } })
      .then((data) => ({ data }), (error: unknown) => ({ error })),
    serverKinloomApi
      .get('/family-spaces/{familySpace}/manage', { path: { familySpace: spaceId } })
      .then((data) => ({ data }), (error: unknown) => ({ error })),
    ...SLOTS.map(slot =>
      serverKinloomApi
        .get('/family-spaces/{familySpace}/featured/candidates', {
          path: { familySpace: spaceId },
          query: { slot, per_page: CANDIDATES },
        })
        .then((data) => ({ data }), (error: unknown) => ({ error })),
    ),
  ]);

  const spaceName = ('data' in manageRes && manageRes.data.space.name?.trim()) || 'this Family Space';

  let forbidden = false;
  let failed = false;
  for (const res of [editorRes, ...candidateRes]) {
    if ('error' in res) {
      if (res.error instanceof ApiError && res.error.status === 403) forbidden = true;
      else failed = true;
    }
  }

  let body: React.ReactNode;
  if (forbidden) {
    body = (
      <div className="empty-card">
        <p className="empty-card__text">
          Only the owner of a Family Space chooses what it features. You can see the result on the Tapestry.
        </p>
      </div>
    );
  } else if (failed || 'error' in editorRes) {
    body = (
      <div className="empty-card">
        <p className="empty-card__text">The featured picks couldn’t be loaded just now. Try again in a moment.</p>
      </div>
    );
  } else {
    const editor = editorRes.data;
    const cards: Record<string, FeaturedCard> = {};
    const slots = {} as Record<Slot, SlotData>;

    SLOTS.forEach((slot, i) => {
      const cr = candidateRes[i];
      if ('error' in cr) return;
      const page = cr.data;
      const info = editor[slot];
      const candidates = page.data.map(c => toCard(c, c.featured_quote, slot));
      for (const fc of candidates) cards[fc.id] = cards[fc.id] ?? fc;
      for (const c of [...info.picks, ...info.automatic]) {
        const q = 'featured_quote' in c ? (c.featured_quote as string | null) : null;
        cards[c.id] = cards[c.id] ?? toCard(c as Card, q, slot);
      }
      slots[slot] = {
        max: info.max,
        picks: info.picks.map(c => c.id),
        automatic: info.automatic.map(c => c.id),
        candidates,
        hasMore: page.meta.total > page.data.length,
      };
    });

    body = <SpaceFeaturedClient spaceId={spaceId} spaceName={spaceName} slots={slots} cards={cards} />;
  }

  return (
    <div className="mg-page">
      <p className="eyebrow">Manage {spaceName}</p>
      <h1 className="mg-page__title">Featured on the Tapestry</h1>
      <ManageTabs scope="space" />
      <p className="feat-lead">
        Choose what the homes in this Family Space see first. Kinloom decides how
        it sits on the page.
      </p>
      {body}
    </div>
  );
}
