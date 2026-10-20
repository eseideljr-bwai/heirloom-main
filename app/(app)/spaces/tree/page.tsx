import Link from 'next/link';
import { getActiveSpace, requireActiveSpaceId } from '../../../../lib/server/auth';
import { getFamilyOverview, getLibraryServer, getManageMembers } from '../../../../lib/server/queries';
import { orNull } from '../../../../lib/server/safe';

export const dynamic = 'force-dynamic';

type Face = { id: string; name: string; tone: string; initials: string };

/**
 * A node in the tree is a Family Home, never a person — the design is
 * emphatic about that, and it is what keeps the tree legible.
 *
 * There is exactly one Home today: the MVP space, which the backend
 * converts into the Family Home. Nothing records lineage between Homes
 * (`lineage_edges` doesn't exist), so the tree renders a single root and
 * the generations below it are structurally unreachable. Every piece of
 * layout here is driven off this array, so the screen fills in as soon
 * as Homes and lineage land — no rework.
 */
type HomeNode = {
  id: string;
  name: string;
  /** Which Home this one descends from. Null at the root. */
  from: string | null;
  depth: number;
  isYours: boolean;
  faces: Face[];
  people: number;
  kinlooms: number;
};

const SPELLED = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
const spell = (n: number) => (n > 0 && n < 10 ? SPELLED[n] : String(n));

function bandLabel(depth: number, rootName: string): string {
  if (depth === 0) return rootName;
  if (depth === 1) return 'Their children’s homes';
  return 'The next generation';
}

function HomeCard({ home }: { home: HomeNode }) {
  return (
    <div className={`tree-home${home.isYours ? ' is-yours' : ''}`}>
      <div className="tree-home__top">
        <span className="tree-home__name">{home.name}</span>
        {home.isYours && <span className="tree-home__you">You</span>}
      </div>
      <p className={`tree-home__from${home.from ? '' : ' is-root'}`}>
        {home.from ? `From ${home.from}` : 'Where this Family Space begins'}
      </p>
      <div className="tree-home__faces">
        {home.faces.slice(0, 5).map(f => (
          <span
            key={f.id}
            className="tree-home__face"
            style={{ background: `${f.tone}28`, color: f.tone }}
            title={f.name}
          >
            {f.initials}
          </span>
        ))}
      </div>
      <div className="tree-home__foot">
        <span className="tree-home__people">
          {home.people} {home.people === 1 ? 'person' : 'people'}
        </span>
        <span className="tree-home__count">
          {home.kinlooms} kinloom{home.kinlooms === 1 ? '' : 's'}
        </span>
      </div>
    </div>
  );
}

export default async function FamilyTreePage() {
  const familySpaceId = await requireActiveSpaceId();

  const [activeSpace, manage, overview, library] = await Promise.all([
    getActiveSpace(),
    getManageMembers(familySpaceId).catch(() => null),
    getFamilyOverview(familySpaceId).catch(() => null),
    orNull(getLibraryServer(familySpaceId)),
  ]);

  const kinlooms = library?.kinlooms ?? [];

  const spaceName = activeSpace?.name?.trim() || 'This Family Space';
  const members = manage?.members ?? [];
  const generations = overview?.generations.length ?? 0;

  const homes: HomeNode[] = [
    {
      id: familySpaceId,
      name: spaceName,
      from: null,
      depth: 0,
      isYours: true,
      faces: members.map(m => ({
        id: m.member_id,
        name: m.name,
        tone: m.tone || '#a39376',
        initials: m.initials || m.name?.charAt(0) || '?',
      })),
      people: members.length,
      kinlooms: kinlooms.length,
    },
  ];

  /** Homes connected to the Space but not yet placed in the lineage. */
  const tray: HomeNode[] = [];

  const rootName = homes.find(h => h.depth === 0)?.name ?? spaceName;
  const depths = Array.from(new Set(homes.map(h => h.depth))).sort((a, b) => a - b);

  return (
    <div className="tree-page">
      <section className="tree-head">
        <p className="eyebrow">Family Space</p>
        <h1 className="tree-head__title">{spaceName}</h1>
        <p className="tree-head__sub">
          {spell(homes.length)} Family Home{homes.length === 1 ? '' : 's'},{' '}
          {members.length} {members.length === 1 ? 'person' : 'people'}
          {generations > 0 && `, ${spell(generations).toLowerCase()} generation${generations === 1 ? '' : 's'}`}.
        </p>
      </section>

      <section className="tree-body">
        {depths.map((d, i) => (
          <div key={d} className="tree-gen">
            <div className="tree-gen__head">
              <span className="tree-gen__label">{bandLabel(d, rootName)}</span>
              <span className="tree-gen__rule" />
            </div>
            <div className="tree-gen__nodes">
              {homes.filter(h => h.depth === d).map(h => <HomeCard key={h.id} home={h} />)}
            </div>
            {i < depths.length - 1 && <div className="tree-gen__edge"><span /></div>}
          </div>
        ))}

        <div className="tree-tray">
          <div className="tree-tray__head">
            <span className="tree-tray__label">Connected, lineage not declared</span>
            <span className="tree-tray__spacer" />
            <span
              className="tree-tray__add no-api"
              data-api-scope="out"
              data-api-note={"NOT SCOPED\nAPI — connecting a Family Home to a Space by invitation, with the Space owner approving and declaring which Home it descends from (SOW 3.1 and 3.2 cover this, but there are no Homes to connect yet).\nUI — opens the Add-a-home sheet: a single select of existing Homes, an option for none, and an optional second parent for a marriage."}
            >
              Add a Family Home →
            </span>
          </div>
          {tray.length > 0 ? (
            <div className="tree-tray__pills">
              {tray.map(h => (
                <span key={h.id} className="tree-tray__pill">
                  <span className="tree-tray__pill-name">{h.name}</span>
                  <span className="tree-tray__pill-people">{h.people} people</span>
                </span>
              ))}
            </div>
          ) : (
            <p
              className="tree-tray__empty no-api"
              data-api-scope="out"
              data-api-note={"NOT SCOPED\nAPI — Family Homes as records separate from the Space, plus `lineage_edges` (display-only descent between Homes within a Space). Neither exists, so this Space has exactly one Home and no lineage to draw.\nUI — every band, connector, card and tray entry on this page is driven off one `homes` array. The layout is complete; it has one node to place."}
            >
              Nothing is waiting to be placed. This Family Space has one Home —
              lineage appears once Homes can be connected to each other.
            </p>
          )}
        </div>

        <div className="tree-note">
          <p className="tree-note__text">
            Each node is a Family Home, not a person. A home declares a single
            thing — which home it came from. The youngest generation lives inside
            these homes rather than forming its own.
          </p>
          <Link href="/spaces/tapestry" className="tree-note__link">
            What this Family Space has published →
          </Link>
        </div>
      </section>
    </div>
  );
}
