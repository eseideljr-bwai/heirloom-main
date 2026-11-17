import { redirect } from 'next/navigation';
import { requireHome } from '../../../../lib/server/auth';

export const dynamic = 'force-dynamic';

/** "My Legacy Bank": your own bank is the one at your person id. */
export default async function MyLegacyBankRedirect() {
  const { user } = await requireHome();
  redirect(`/legacy-bank/${user.person_id}`);
}
