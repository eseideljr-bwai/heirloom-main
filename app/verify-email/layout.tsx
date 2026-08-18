import { redirect } from 'next/navigation';
import { verifySession } from '../../lib/server/auth';

/**
 * Session gate only — deliberately no email-verified check, since an
 * unverified account is exactly who this screen is for. Sits outside the
 * (app) and onboarding route groups, so without this the route was covered
 * by nothing but middleware's cookie-presence check.
 */
export default async function VerifyEmailLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();
  if (!session) redirect('/?reason=session_expired');

  return <>{children}</>;
}
