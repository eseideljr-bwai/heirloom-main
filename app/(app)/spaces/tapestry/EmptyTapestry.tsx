import Link from 'next/link';
import type { SpaceManage } from '../../../../lib/space-manage';
import SpaceHomesPanel from './SpaceHomesPanel';

/**
 * A Family Space nothing is published to yet. The first kinloom published
 * here opens the Tapestry, and meanwhile the page shows who is in the Space
 * and, for its owner, a way to invite more Homes.
 *
 * `manage` is `GET …/manage`; when it couldn't be read the Homes panel is
 * left out and the rest still stands.
 */
export default function EmptyTapestry({
  spaceId,
  spaceName,
  description,
  manage,
  justCreated,
}: {
  spaceId: string;
  spaceName: string;
  description: string | null;
  manage: SpaceManage | null;
  justCreated: boolean;
}) {
  const homes = manage?.homes ?? [];
  const invited = manage?.invitations?.length ?? 0;

  const summary = !manage
    ? null
    : homes.length === 1 && invited === 0
      ? 'Just your home so far.'
      : [
          homes.length === 1 ? 'Your home' : `${homes.length} homes`,
          invited > 0 ? `${invited} invitation${invited === 1 ? '' : 's'} out` : null,
        ].filter(Boolean).join(', ') + '.';

  return (
    <div className="tap-page">
      <section className="tap-head">
        <p className="eyebrow">{justCreated ? 'Family Space · just created' : 'The Family Tapestry'}</p>
        <h1 className="tap-head__title">{spaceName}</h1>
        {(description?.trim() || summary) && (
          <p className="tap-head__lead">{description?.trim() || summary}</p>
        )}
      </section>

      <section className="sp-empty">
        <div className="sp-empty__card">
          <p className="sp-empty__eyebrow">Family Tapestry</p>
          <h2 className="sp-empty__title">The first kinloom published here opens the tapestry.</h2>
          <p className="sp-empty__text">
            Write something new for this family, or send something you have already kept.
          </p>
          <div className="sp-empty__actions">
            <Link href="/create?from=tapestry" className="btn-save" style={{ textDecoration: 'none' }}>
              Create a kinloom
            </Link>
            <Link href="/vault" className="sp-empty__link">Choose from My Vault →</Link>
          </div>
        </div>

        {manage && (
          <SpaceHomesPanel
            spaceId={spaceId}
            homes={homes}
            invitations={manage.invitations}
            canInvite={manage.space.viewer.can_edit}
          />
        )}
      </section>
    </div>
  );
}
