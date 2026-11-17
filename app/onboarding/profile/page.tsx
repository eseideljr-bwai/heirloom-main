import { redirect } from 'next/navigation';
import { getUserState } from '../../../lib/server/auth';
import OnboardingProfileForm from './OnboardingProfileForm';

export const dynamic = 'force-dynamic';

/**
 * Server guard around the form. Only a `profile_pending` account belongs
 * here: a finished person has nothing left to fill in (the step is safe to
 * repeat, but there is no path back to it).
 */
export default async function OnboardingProfilePage() {
  const state = await getUserState();
  if (state.status === 'unauthenticated') redirect('/?reason=session_expired');
  if (state.status !== 'onboarding') redirect('/home');

  return <OnboardingProfileForm />;
}
