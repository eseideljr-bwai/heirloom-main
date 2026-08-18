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

  // Nothing used to stop a finished user from landing back here, so a stray
  // redirect left them staring at the wizard with no way out but the nav.
  // Only `complete` is checked: step 3 (first kinloom) runs *after* the
  // family space exists, so `ready` alone would skip it.
  const state = await getUserState();
  if (state.status === 'ready' && state.user.onboarding_state === 'complete') {
    redirect('/home');
  }

  return <OnboardingChrome>{children}</OnboardingChrome>;
}
