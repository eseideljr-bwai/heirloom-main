import { redirect } from 'next/navigation';
import { getUserState, verifySession } from '../../lib/server/auth';
import OnboardingChrome from './OnboardingChrome';

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  // Same hard gate as the (app) group: onboarding is off-limits until
  // the account's email is verified.
  const session = await verifySession();
  if (session && !session.emailVerified) {
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
