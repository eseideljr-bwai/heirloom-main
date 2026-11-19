import { redirect } from 'next/navigation';
import { verifySession } from '../../lib/server/auth';
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

  // Where a person may be is each step's call, not the layout's: saving the
  // profile completes onboarding, yet the photo step still comes after it.
  return <OnboardingChrome>{children}</OnboardingChrome>;
}
