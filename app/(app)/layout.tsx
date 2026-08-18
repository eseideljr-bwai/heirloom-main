import { redirect } from 'next/navigation';
import { verifySession } from '../../lib/server/auth';
import AppShell from '../components/AppShell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // The authentication boundary for this route group. Middleware only
  // presence-checks the cookie and AppShell's guard is client-side, so
  // neither is a gate — and several pages in here (create, settings, help)
  // fetch nothing server-side, so they have none of their own.
  const session = await verifySession();
  if (!session) redirect('/?reason=session_expired');

  // The email-verified check belongs here too, but ships with the Laravel
  // half — enabling it alone locks out accounts created while both were open.

  return <AppShell>{children}</AppShell>;
}
