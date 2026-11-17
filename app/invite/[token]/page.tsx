import { ApiError } from '../../../lib/api';
import { serverApiFetch } from '../../../lib/server/api';
import { verifySession } from '../../../lib/server/auth';
import { serverKinloomApi } from '../../../lib/server/kinloom-api';
import { buildUrl } from '../../../lib/api-schema/typed';
import { apiErrorCode, type InvitationPreview } from '../../../lib/invitations';
import { orNull } from '../../../lib/server/safe';
import InviteAcceptClient, { type DeadReason, type VaultChoice } from './InviteAcceptClient';

export const dynamic = 'force-dynamic';

/** The kinlooms the picker offers: at most the Vault's first page of final ones. */
const PICKER_MAX = 50;

/**
 * The invitation page. The preview is read here, on the server, so the first
 * paint already says who invited you and to what. With a session the call is
 * authenticated (the API then adds the invitee tier when your verified email
 * is the invited one); without one it is the public tier. The Vault's final
 * kinlooms load beside it, for the "publish what you've written" step.
 */
export default async function InviteAcceptPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const session = await verifySession();

  const previewUrl = buildUrl('/invitations/{token}', { token });
  const fetchPreview = async (anonymous: boolean) =>
    serverApiFetch<InvitationPreview>(previewUrl, { anonymous });

  const [previewResult, vault] = await Promise.all([
    fetchPreview(!session)
      .catch(async (err: unknown) => {
        // A token the API refuses is not a dead link: fall back to the public tier.
        if (session && err instanceof ApiError && err.status === 401) return fetchPreview(true);
        throw err;
      })
      .then(
        (preview) => ({ preview }),
        (error: unknown) => ({ error }),
      ),
    session
      ? orNull(serverKinloomApi.get('/vault', { query: { status: 'final', per_page: PICKER_MAX } }))
      : Promise.resolve(null),
  ]);

  let dead: DeadReason | null = null;
  let preview: InvitationPreview | null = null;
  if ('error' in previewResult) {
    const err = previewResult.error;
    const code = apiErrorCode(err);
    if (err instanceof ApiError && err.status === 410) dead = code === 'invitation_expired' ? 'expired' : 'used';
    else if (err instanceof ApiError && err.status === 404) dead = 'not_found';
    else dead = 'unavailable';
  } else {
    preview = previewResult.preview;
  }

  const choices: VaultChoice[] = (vault?.data ?? []).map(item => ({
    id: item.id,
    title: item.title || 'Untitled',
    type: item.type.label,
    // Only what is live now comes back by default; "after I pass" stays the author's call.
    wasPublished: item.publications.some(p => p.when === 'now'),
  }));

  return (
    <InviteAcceptClient
      token={token}
      preview={preview}
      dead={dead}
      session={session ? { email: session.email, emailVerified: session.emailVerified } : null}
      vault={choices}
    />
  );
}
