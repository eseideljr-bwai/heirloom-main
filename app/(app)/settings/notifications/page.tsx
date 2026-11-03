import { requireHome } from '../../../../lib/server/auth';
import { serverKinloomApi } from '../../../../lib/server/kinloom-api';
import NotificationsClient from './NotificationsClient';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  await requireHome();
  const settings = await serverKinloomApi.get('/me/settings');
  return <NotificationsClient initial={settings} />;
}
