import { requireActiveSpaceId } from '../../../lib/server/auth';
import FirstKinloomForm from './FirstKinloomForm';

export const dynamic = 'force-dynamic';

/**
 * Resolve the space server-side and hand it to the form. Reading it from
 * client context meant a lagging /me surfaced as "No family space found.
 * Please finish setting up your profile first." on a user who had just
 * finished exactly that — and the guard redirects to step 2 instead if the
 * space genuinely doesn't exist yet.
 */
export default async function OnboardingFirstKinloomPage() {
  const familySpaceId = await requireActiveSpaceId();
  return <FirstKinloomForm familySpaceId={familySpaceId} />;
}
