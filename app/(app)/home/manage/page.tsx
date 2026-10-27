import Link from 'next/link';
import { ApiError } from '../../../../lib/api';
import { requireHome } from '../../../../lib/server/auth';
import { serverKinloomApi } from '../../../../lib/server/kinloom-api';
import ManageTabs from '../../../components/ManageTabs';
import ManageFamilyClient from './ManageFamilyClient';

export const dynamic = 'force-dynamic';

/**
 * Manage Family: the people in this Home, their roles, and seat usage.
 *
 * `GET /family-homes/{id}/manage` is for the owner and co-owner; for anyone
 * else it answers 403 and the page explains instead of failing. Every button
 * is gated on the flags that response carries (`viewer.can_*`,
 * `people[].can_edit`, `can_remove`), never on the client's own idea of roles.
 */
export default async function ManageFamilyPage() {
  const { homeId, home } = await requireHome();
  const homeName = home.name?.trim() || 'Your Family Home';

  let manage = null;
  let forbidden = false;
  try {
    manage = await serverKinloomApi.get('/family-homes/{familyHome}/manage', {
      path: { familyHome: homeId },
    });
  } catch (err) {
    if (!(err instanceof ApiError)) throw err;
    forbidden = err.status === 403;
  }

  const meter = (used: number, max: number) => (max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0);

  return (
    <div className="mg-page">
      <p className="eyebrow">Manage your Family Home</p>
      <h1 className="mg-page__title">{homeName}</h1>
      <ManageTabs />

      <div className="mg-notice">
        <span className="mg-notice__text">
          {forbidden
            ? 'You are a member of this home. Only the owner and co-owner can invite, add or remove people.'
            : manage?.read_only
              ? 'This home is read-only because it lost its owner. Everything can still be read, but nothing here can change.'
              : 'Anyone you invite can read everything published here, and publish their own.'}
        </span>
      </div>

      <div className="mg-grid">
        <div>
          {manage ? (
            <ManageFamilyClient homeId={homeId} manage={manage} />
          ) : (
            <div className="mg-card">
              <div className="mg-card__head">
                <span className="mg-card__title">People</span>
              </div>
              <p className="mg-card__empty">
                {forbidden
                  ? 'Members can see who is in the home on the Home page.'
                  : 'The member list couldn’t be loaded just now. Nothing you have written is affected. Try again in a moment.'}
              </p>
            </div>
          )}
        </div>

        <aside className="mg-seats">
          <p className="mg-seats__label">Seats</p>
          <p className="mg-seats__summary">
            {manage ? `${manage.seats.used} of ${manage.seats.max} seats used` : 'Unavailable'}
          </p>

          <div
            className="mg-seats__bar"
            role="img"
            aria-label={manage ? `${manage.seats.used} of ${manage.seats.max} seats used` : 'Seat usage unavailable'}
          >
            <span
              className="mg-seats__fill"
              style={{ width: `${manage ? meter(manage.seats.used, manage.seats.max) : 0}%` }}
            />
          </div>

          <p className="mg-seats__scope">
            Seats count accounts and pending invitations. Someone who appears in this home without an
            account, like a child or a relative who has passed, uses none.
            {manage && ` Family profiles: ${manage.profiles.used} of ${manage.profiles.max}.`}
          </p>

          {manage && manage.invitations.length > 0 && (
            <p className="mg-seats__pending">
              {manage.invitations.length} invitation{manage.invitations.length === 1 ? '' : 's'} outstanding.
            </p>
          )}
        </aside>
      </div>

      <p className="mg-page__foot">
        Looking for the wider family? <Link href="/spaces">Your Family Spaces →</Link>
      </p>
    </div>
  );
}
