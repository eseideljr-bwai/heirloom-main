import { redirect } from 'next/navigation';
import { getUserState } from '../../lib/server/auth';
import { isEmbeddedRequest } from '../../lib/server/embed';
import AppShell from '../components/AppShell';
import MemorializedNotice from '../components/MemorializedNotice';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // The authentication boundary for this route group. Middleware only
  // presence-checks the cookie and AppShell's guard is client-side, so
  // neither is a gate — and several pages in here (create, settings, help)
  // fetch nothing server-side, so they have none of their own.
  //
  // getUserState is request-cached and the root layout already called it, so
  // this adds no round-trip.
  const state = await getUserState();
  if (state.status === 'unauthenticated') redirect('/?reason=session_expired');

  // A memorialized account reads /me and nothing else (CO-1 C2): every other
  // route answers it 403, so there is nothing for the app to show.
  if (state.status === 'memorialized') return <MemorializedNotice />;

  // Finish the profile step first. In the iOS WebView onboarding is a native
  // screen, so AppShell asks native to close instead of redirecting.
  if (state.status === 'onboarding' && !isEmbeddedRequest()) redirect('/onboarding/profile');

  // The email-verified check belongs here too, but ships with the Laravel
  // half — enabling it alone locks out accounts created while both were open.

  return <AppShell>{children}</AppShell>;
}
