import { requireHome } from '../../../../lib/server/auth';
import { serverKinloomApi } from '../../../../lib/server/kinloom-api';
import PrivacyClient from './PrivacyClient';

export const dynamic = 'force-dynamic';

export default async function PrivacyPage() {
  const [{ user }, settings] = await Promise.all([
    requireHome(),
    serverKinloomApi.get('/me/settings'),
  ]);
  return (
    <PrivacyClient
      initial={settings}
      legacyContact={user.legacy_contact}
      legacyContactFor={user.legacy_contact_for}
      homeReadOnly={user.home.read_only}
    />
  );
}
