import { requireActiveSpaceId } from '../../../../lib/server/auth';
import { getMeSettings } from '../../../../lib/server/queries';
import NotificationsClient from './NotificationsClient';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const familySpaceId = await requireActiveSpaceId();
  const settings = await getMeSettings(familySpaceId);
  return <NotificationsClient initial={settings.notifications} />;
}
