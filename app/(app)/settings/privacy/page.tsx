import { requireActiveSpaceId } from '../../../../lib/server/auth';
import { getMeSettings } from '../../../../lib/server/queries';
import PrivacyClient from './PrivacyClient';

export const dynamic = 'force-dynamic';

export default async function PrivacyPage() {
  const familySpaceId = await requireActiveSpaceId();
  const settings = await getMeSettings(familySpaceId);
  return <PrivacyClient initial={settings.privacy} />;
}
