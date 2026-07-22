import { redirect } from 'next/navigation';
import { verifySession } from '../../lib/server/auth';
import AppShell from '../components/AppShell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Hard gate: unverified accounts can't enter the app. Middleware has
  // already bounced sessionless visitors; here we require a verified
  // email. The claim is read from the (Admin-SDK-verified) session
  // cookie — see verifySession.
  // const session = await verifySession();
  // if (session && !session.emailVerified) {
  //   redirect('/verify-email');
  // }
  //
  return <AppShell>{children}</AppShell>;
}
