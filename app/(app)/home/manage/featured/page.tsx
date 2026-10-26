import { ApiError } from '../../../../../lib/api';
import { requireHome } from '../../../../../lib/server/auth';
import { serverKinloomApi } from '../../../../../lib/server/kinloom-api';
import type { components } from '../../../../../lib/api-schema/typed';
import ManageTabs from '../../../../components/ManageTabs';
import HomeFeaturedClient, { type FeaturedCard, type SlotData } from './HomeFeaturedClient';

export const dynamic = 'force-dynamic';

type Card = components['schemas']['KinloomCard'];
type Slot = 'hero' | 'quote' | 'voice' | 'lately';

/** Candidate cards are not paged through here: the 50 most recent per slot. */
const CANDIDATES = 50;

/** A card is labelled by what it's being offered for: a voice slot says Voice, the hero says Film or Photograph. */
function toCard(c: Card, quote: string | null = null, slot: Slot = 'lately'): FeaturedCard {
  const visual = c.has_video ? 'film' : c.has_photo ? 'photograph' : null;
  const kind: FeaturedCard['kind'] =
    slot === 'voice' ? 'voice'
    : slot === 'hero' ? visual ?? 'written'
    : visual ?? (c.has_audio ? 'voice' : 'written');
  return { id: c.id, title: c.title || 'Untitled', by: c.author.name, kind, quote };
}

/**
 * Featured on Home: what the owner or co-owner picks for the four slots.
 * Picks, the automatic fallback and the eligible cards per slot all come from
 * the API; nothing is stored in the browser. Members who can't edit get a
 * plain explanation (403), since they see the result on Home itself.
 */
export default async function FeaturedOnHomePage() {
  const { homeId, home } = await requireHome();
  const homeName = home.name?.trim() || 'your Family Home';

  // Five independent reads, one round of waiting.
  const slotsList: Slot[] = ['hero', 'quote', 'voice', 'lately'];
  const [editorRes, ...candidateRes] = await Promise.all([
    serverKinloomApi
      .get('/family-homes/{familyHome}/featured', { path: { familyHome: homeId } })
      .then((data) => ({ data }), (error: unknown) => ({ error })),
    ...slotsList.map(slot =>
      serverKinloomApi
        .get('/family-homes/{familyHome}/featured/candidates', {
          path: { familyHome: homeId },
          query: { slot, per_page: CANDIDATES },
        })
        .then((data) => ({ data }), (error: unknown) => ({ error })),
    ),
  ]);

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
          Only the owner and co-owner of a home choose what it features. You can see the result on Home.
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

    slotsList.forEach((slot, i) => {
      const cr = candidateRes[i];
      if ('error' in cr) return;
      const page = cr.data;
      const info = editor[slot];
      const candidates = page.data.map(c => toCard(c, c.featured_quote, slot));
      for (const fc of candidates) cards[fc.id] = cards[fc.id] ?? fc;
      for (const c of [...info.picks, ...info.automatic]) cards[c.id] = cards[c.id] ?? toCard(c, null, slot);
      slots[slot] = {
        max: info.max,
        picks: info.picks.map(c => c.id),
        automatic: info.automatic.map(c => c.id),
        candidates,
        hasMore: page.meta.total > page.data.length,
      };
    });

    body = <HomeFeaturedClient homeId={homeId} homeName={homeName} slots={slots} cards={cards} />;
  }

  return (
    <div className="mg-page">
      <p className="eyebrow">Manage your Family Home</p>
      <h1 className="mg-page__title">Featured on Home</h1>
      <ManageTabs />
      <p className="feat-lead">
        Choose what the people in your home see first. Kinloom decides how it
        sits on the page.
      </p>
      {body}
    </div>
  );
}
