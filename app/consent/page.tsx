import { redirect } from 'next/navigation';
import { getUserState } from '../../lib/server/auth';
import { getConsentGiven, safeConsentNext } from '../../lib/server/consent';
import { ConsentCard } from './ConsentCard';

export const dynamic = 'force-dynamic';

// Title comes from the analytics route map (root layout).

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: { next?: string | string[] };
}) {
  const state = await getUserState();
  if (state.status === 'unauthenticated') redirect('/?reason=session_expired');

  const next = safeConsentNext(typeof searchParams.next === 'string' ? searchParams.next : null);

  // Already accepted the current versions: nothing to do here.
  if ((await getConsentGiven()) === true) redirect(next);

  return <ConsentCard next={next} />;
}
