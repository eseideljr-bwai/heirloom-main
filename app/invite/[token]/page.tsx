import { renderInvitePage } from '../render';

export const dynamic = 'force-dynamic';

/**
 * /invite/<token>. middleware.ts copies the token into an HttpOnly cookie
 * scoped to /invite; once the page has read it, the analytics root strips the
 * token from the address bar (→ /invite, see app/invite/page.tsx).
 */
export default async function InviteAcceptPage({ params }: { params: { token: string } }) {
  return renderInvitePage(params.token);
}
