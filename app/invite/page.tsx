import { cookies } from 'next/headers';
import { INVITE_TOKEN_COOKIE } from '../../lib/server/cookies';
import { renderInvitePage } from './render';
import InviteAcceptClient from './[token]/InviteAcceptClient';

export const dynamic = 'force-dynamic';

/**
 * Bare /invite: where /invite/<token> lands once its token has been stripped
 * from the address bar. The token comes back from the HttpOnly cookie
 * middleware set on the way in, so a refresh, router.refresh() or a server
 * action here behaves exactly as on the tokened URL.
 */
export default async function InviteFromCookiePage() {
  const token = cookies().get(INVITE_TOKEN_COOKIE)?.value;
  if (token) return renderInvitePage(token);
  return <InviteAcceptClient token="" preview={null} dead="not_found" session={null} vault={[]} />;
}
