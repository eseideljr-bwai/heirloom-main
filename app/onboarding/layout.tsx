import { redirect } from 'next/navigation';
import { getUserState, verifySession } from '../../lib/server/auth';
import OnboardingChrome from './OnboardingChrome';

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  // Same hard gate as the (app) group. Onboarding sits outside that route
  // group, so it needs its own — and the null branch is load-bearing: without
  // it an unverified *or absent* session fell straight through to the wizard.
  const session = await verifySession();
  if (!session) redirect('/?reason=session_expired');
  if (!session.emailVerified) {
    redirect('/verify-email');
  }

  // A finished person has nothing left to do here, so a stray redirect
  // must not leave them in the wizard. `complete` never goes back to
  // `profile_pending`.
  const state = await getUserState();
  if (state.status === 'ready' || state.status === 'memorialized') redirect('/home');

  return <OnboardingChrome>{children}</OnboardingChrome>;
}
