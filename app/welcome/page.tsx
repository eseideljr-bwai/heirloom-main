import { redirect } from 'next/navigation';
import { getUserState, verifySession } from '../../lib/server/auth';
import WelcomeSplash from './WelcomeSplash';

export const dynamic = 'force-dynamic';

/**
 * The onboarding splash. Shown once after a user first reaches /home (the
 * gate lives in app/(app)/home/page.tsx and keys off the per-user cookie),
 * and revisitable from Home, the checklist, and Help.
 *
 * Deliberately outside the (app) group: no sidebar, full-bleed.
 */
export default async function WelcomePage() {
  const session = await verifySession();
  if (!session) redirect('/?reason=session_expired');

  const state = await getUserState();
  if (state.status === 'unauthenticated') redirect('/?reason=session_expired');
  // No family space yet → the account-setup wizard owns this user for now.
  if (state.status !== 'ready') redirect('/onboarding/profile');

  return <WelcomeSplash userUlid={state.user.ulid} />;
}
