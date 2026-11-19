import { redirect } from 'next/navigation';
import { getUserState } from '../../../lib/server/auth';
import { serverKinloomApi } from '../../../lib/server/kinloom-api';
import OnboardingPhotoStep from './OnboardingPhotoStep';

export const dynamic = 'force-dynamic';

/**
 * The last step, after the profile is saved. Saving it already completed
 * onboarding, so this step is for a `ready` account; one still
 * `profile_pending` goes back to the profile first. Skipping it is fine:
 * the same photo can be added later from My Portrait.
 */
export default async function OnboardingPhotoPage() {
  const state = await getUserState();
  if (state.status === 'unauthenticated') redirect('/?reason=session_expired');
  if (state.status === 'onboarding') redirect('/onboarding/profile');
  if (state.status !== 'ready') redirect('/home');

  const profile = await serverKinloomApi.get('/me/profile');
  return <OnboardingPhotoStep person={profile.person} avatarUrl={profile.avatar_url} />;
}
