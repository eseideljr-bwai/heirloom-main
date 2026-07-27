import { redirect } from 'next/navigation';
import { getUserState } from '../../../lib/server/auth';
import OnboardingProfileForm from './OnboardingProfileForm';

export const dynamic = 'force-dynamic';

/**
 * Server guard around the form. Submitting this step creates a family
 * space, so a user who already has one must not be able to submit it
 * again — that's how duplicate spaces were getting created whenever a
 * stray redirect dropped an existing user back here.
 */
export default async function OnboardingProfilePage() {
  const state = await getUserState();
  if (state.status === 'unauthenticated') redirect('/?reason=session_expired');
  if (state.status === 'ready') redirect('/onboarding/first-kinloom');

  return <OnboardingProfileForm />;
}
