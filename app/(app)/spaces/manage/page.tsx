import Link from 'next/link';
import { getActiveSpace, getCurrentUser, requireActiveSpaceId } from '../../../../lib/server/auth';
import { getLibraryServer, getManageMembers } from '../../../../lib/server/queries';
import { isOwnerOfSpace } from '../../../../lib/auth';
import ManageTabs from '../../../components/ManageTabs';
import { orNull } from '../../../../lib/server/safe';

export const dynamic = 'force-dynamic';

/** SOW 3.1 caps a Family Space at 20 Homes, held as a setting. */
const HOMES_CAP_NOTE =
  "NOT SCOPED\nAPI — Family Homes as records that join a Space, the Space's home cap (SOW 3.1 sets 20, held as a setting), and `lineage_edges` for the Edit lineage action. None exist, so this Space contains exactly one Home — itself — and there is no cap to measure against.\nUI — every row and the seat bar are driven off one `homes` array; both fill in unchanged once Homes join Spaces.";

export default async function ManageFamilySpacePage() {
  const familySpaceId = await requireActiveSpaceId();

  const [activeSpace, user, manage, library] = await Promise.all([
    getActiveSpace(),
    getCurrentUser(),
    getManageMembers(familySpaceId).catch(() => null),
    orNull(getLibraryServer(familySpaceId)),
  ]);

  const kinlooms = library?.kinlooms ?? [];

  const spaceName = activeSpace?.name?.trim() || 'this Family Space';
  const isOwner = isOwnerOfSpace(user, familySpaceId);
  const members = manage?.members ?? [];

  // One Home today: the container itself. Same array the tree is built from.
  const homes = [
    {
      id: familySpaceId,
      name: spaceName,
      people: members.length,
      kinlooms: kinlooms.length,
      placed: true,
    },
  ];

  return (
    <div className="mg-page">
      <p className="eyebrow">Manage {spaceName}</p>
      <h1 className="mg-page__title">{spaceName}</h1>
      <ManageTabs scope="space" />

      <div className="mg-notice">
        <span className="mg-notice__text">
          {isOwner
            ? `You own ${spaceName}. You approve the Homes that join it and declare where each one sits in the tree.`
            : `You are a member of ${spaceName}. You can see which Homes belong and leave at any time.`}
        </span>
      </div>

      <div className="mg-grid">
        <div className="mg-card">
          <div className="mg-card__head">
            <span className="mg-card__title">Family Homes in this Space</span>
            <span className="mg-card__spacer" />
            <span
              className="mg-card__note no-api"
              data-api-scope="in"
              data-api-note={"IN SCOPE · SOW 3.1\nAPI — a member Home leaving a Space, which withdraws visibility of everything its members published there without touching their Vaults or other rooms.\nUI — a confirm step naming what stops being visible, then the Home drops out of the tree."}
            >
              Leave this Family Space
            </span>
          </div>

          {homes.map(h => (
            <div key={h.id} className="mg-row">
              <div className="mg-row__body">
                <p className="mg-row__name mg-row__name--home">{h.name}</p>
                <p className="mg-row__sub">
                  {h.people} {h.people === 1 ? 'person' : 'people'} · {h.kinlooms} kinloom
                  {h.kinlooms === 1 ? '' : 's'} published here
                </p>
              </div>
              <div className="mg-row__actions">
                <span
                  className="mg-btn no-api"
                  data-api-scope="in"
                  data-api-note={"IN SCOPE · SOW 3.2\nAPI — lineage: which Home this one descends from, declared by the Space owner at join or later, with an optional second parent where a marriage joins two lines. Display data only — never read to decide access.\nUI — a single select of the other Homes, plus an option for none."}
                >
                  {h.placed ? 'Edit lineage' : 'Place in tree'}
                </span>
              </div>
            </div>
          ))}
        </div>

        <aside className="mg-seats">
          <p className="mg-seats__label">Seats</p>
          <p className="mg-seats__summary">
            {homes.length} home{homes.length === 1 ? '' : 's'}
          </p>

          <div className="no-api" data-api-scope="out" data-api-note={HOMES_CAP_NOTE}>
            <div className="mg-seats__bar" role="img" aria-label="Home allowance unavailable">
              <span className="mg-seats__fill" style={{ width: '0%' }} />
            </div>
            <p className="mg-seats__note">
              The cap on Homes isn’t set by the API yet, so there’s nothing to
              measure the {homes.length} against.
            </p>
          </div>

          <p className="mg-seats__scope">
            A Family Space connects homes, not people. Each home manages its own
            seats, and nothing here lets you reach inside another home.
          </p>
        </aside>
      </div>

      <p className="mg-page__foot">
        <Link href="/spaces/tree">See the family tree →</Link>
      </p>
    </div>
  );
}
