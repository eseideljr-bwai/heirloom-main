import { redirect } from 'next/navigation';
import { getActiveSpaceId } from '../../../../lib/server/auth';
import { getMeSettings } from '../../../../lib/server/queries';
import PrivacyClient from './PrivacyClient';

export const dynamic = 'force-dynamic';

export default async function PrivacyPage() {
  const familySpaceId = await getActiveSpaceId();
  if (!familySpaceId) redirect('/onboarding/profile');
  const settings = await getMeSettings(familySpaceId);
  return <PrivacyClient initial={settings.privacy} />;
}
