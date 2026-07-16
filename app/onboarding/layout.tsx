import { redirect } from 'next/navigation';
import { verifySession } from '../../lib/server/auth';
import OnboardingChrome from './OnboardingChrome';

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  // Same hard gate as the (app) group: onboarding is off-limits until
  // the account's email is verified.
  const session = await verifySession();
  if (session && !session.emailVerified) {
    redirect('/verify-email');
  }

  return <OnboardingChrome>{children}</OnboardingChrome>;
}
