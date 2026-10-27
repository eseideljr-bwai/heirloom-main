import { redirect } from 'next/navigation';

/**
 * Onboarding ends at the profile step now: `onboarding_state` turns
 * `complete` the moment it is saved, and it never depends on having written
 * a kinloom (Phase 3 contract §3.1). Anything still linking here lands on
 * the Home screen. `FirstKinloomForm` is unreferenced and can be deleted.
 */
export default function OnboardingFirstKinloomPage() {
  redirect('/home');
}
