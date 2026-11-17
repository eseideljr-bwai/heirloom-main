import Link from 'next/link';
import { ApiError } from '../../../../lib/api';
import { getActiveFamilySpaceId, getUserState, requireHome } from '../../../../lib/server/auth';
import { serverKinloomApi } from '../../../../lib/server/kinloom-api';
import type { components } from '../../../../lib/api-schema/typed';
import DataNotice from '../../../components/DataNotice';
import NoFamilySpace from '../../../components/NoFamilySpace';

export const dynamic = 'force-dynamic';

type TreeHome = components['schemas']['SpaceTreeHome'];

/**
 * A node in the tree is a Family Home, never a person. Everything here is
 * display: the API says which Homes sit where, and lineage never decides who
 * can read what. A Home with no declared lineage is "unplaced": it takes part
 * fully and waits in the tray below the tree.
 */

const SPELLED = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
const spell = (n: number) => (n > 0 && n < 10 ? SPELLED[n] : String(n));

function bandLabel(depth: number): string {
  if (depth === 0) return 'Where this Family Space begins';
  if (depth === 1) return 'Their children’s homes';
  return 'The next generation';
}

function HomeCard({ home, from }: { home: TreeHome; from: string[] }) {
  return (
    <div className={`tree-home${home.is_your_home ? ' is-yours' : ''}`}>
      <div className="tree-home__top">
        <span className="tree-home__name">{home.name}</span>
        {home.is_your_home && <span className="tree-home__you">You</span>}
      </div>
      <p className={`tree-home__from${from.length ? '' : ' is-root'}`}>
        {from.length ? `From ${from.join(' and ')}` : 'Where this line begins'}
      </p>
      <div className="tree-home__faces">
        {home.faces.map(f => (
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
          {home.members} {home.members === 1 ? 'person' : 'people'}
        </span>
        <span className="tree-home__count">
          {home.kinlooms} kinloom{home.kinlooms === 1 ? '' : 's'}
        </span>
      </div>
    </div>
  );
}

export default async function FamilyTreePage() {
  await requireHome();
  const spaceId = await getActiveFamilySpaceId();
  if (!spaceId) return <NoFamilySpace what="the family tree" />;

  // The Space's name and your role come from /me, which the layout already
  // read; the tree itself is the one call this page makes.
  const [state, tree] = await Promise.all([
    getUserState(),
    serverKinloomApi
      .get('/family-spaces/{familySpace}/tree', { path: { familySpace: spaceId } })
      .catch((err: unknown) => {
        if (err instanceof ApiError) return null;
        throw err;
      }),
  ]);
  const space = state.status === 'ready' ? state.spaces.find(s => s.id === spaceId) : undefined;
  const spaceName = space?.name?.trim() || 'This Family Space';
  const canAdd = space?.role === 'owner' && !space.read_only;

  const generations = tree?.generations ?? [];
  const unplaced = tree?.unplaced ?? [];
  const nameById = new Map<string, string>();
  for (const g of generations) for (const h of g.homes) nameById.set(h.id, h.name);
  const parentsOf = (id: string) =>
    (tree?.edges ?? [])
      .filter(e => e.child_home_id === id)
      .map(e => nameById.get(e.parent_home_id))
      .filter((n): n is string => Boolean(n));

  const allHomes = [...generations.flatMap(g => g.homes), ...unplaced];
  const people = allHomes.reduce((n, h) => n + h.members, 0);

  return (
    <div className="tree-page">
      <section className="tree-head">
        <p className="eyebrow">Family Space</p>
        <h1 className="tree-head__title">{spaceName}</h1>
        {tree && (
          <p className="tree-head__sub">
            {spell(allHomes.length)} Family Home{allHomes.length === 1 ? '' : 's'},{' '}
            {people} {people === 1 ? 'person' : 'people'}
            {generations.length > 0 &&
              `, ${spell(generations.length).toLowerCase()} generation${generations.length === 1 ? '' : 's'}`}
            .
          </p>
        )}
      </section>

      {tree === null && (
        <section className="tree-head">
          <DataNotice what="the family tree" />
        </section>
      )}

      {tree && (
        <section className="tree-body">
          {generations.map((g, i) => (
            <div key={g.generation} className="tree-gen">
              <div className="tree-gen__head">
                <span className="tree-gen__label">{bandLabel(g.generation - 1)}</span>
                <span className="tree-gen__rule" />
              </div>
              <div className="tree-gen__nodes">
                {g.homes.map(h => <HomeCard key={h.id} home={h} from={parentsOf(h.id)} />)}
              </div>
              {i < generations.length - 1 && <div className="tree-gen__edge"><span /></div>}
            </div>
          ))}

          <div className="tree-tray">
            <div className="tree-tray__head">
              <span className="tree-tray__label">Connected, lineage not declared</span>
              <span className="tree-tray__spacer" />
              {canAdd && (
                <Link href="/spaces/manage" className="tree-tray__add">Add a Family Home →</Link>
              )}
            </div>
            {unplaced.length > 0 ? (
              <div className="tree-tray__pills">
                {unplaced.map(h => (
                  <span key={h.id} className="tree-tray__pill">
                    <span className="tree-tray__pill-name">{h.name}</span>
                    <span className="tree-tray__pill-people">{h.members} {h.members === 1 ? 'person' : 'people'}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="tree-tray__empty">
                {generations.length === 0
                  ? 'No Family Home has been placed on the tree yet.'
                  : 'Nothing is waiting to be placed.'}
              </p>
            )}
          </div>

          <div className="tree-note">
            <p className="tree-note__text">
              Each node is a Family Home, not a person. A home declares a single
              thing — which home it came from. The tree is only a picture: it never
              changes who can read what.
            </p>
            <Link href="/spaces/tapestry" className="tree-note__link">
              What this Family Space has published →
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
