import { requireHome } from '../../../lib/server/auth';
import { serverKinloomApi } from '../../../lib/server/kinloom-api';
import AccountClient from './AccountClient';

export const dynamic = 'force-dynamic';

/** Account: the profile form is prefilled on the server, so it paints complete. */
export default async function AccountPage() {
  const { user } = await requireHome();
  const profile = await serverKinloomApi.get('/me/profile');
  return <AccountClient initial={profile} plan={user.plan} />;
}
