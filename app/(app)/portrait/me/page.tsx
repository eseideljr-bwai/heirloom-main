import { redirect } from 'next/navigation';
import { requireHome } from '../../../../lib/server/auth';

export const dynamic = 'force-dynamic';

/** "My Portrait": your own portrait is the one at your person id. */
export default async function MyPortraitRedirect() {
  const { user } = await requireHome();
  redirect(`/portrait/${user.person_id}`);
}
