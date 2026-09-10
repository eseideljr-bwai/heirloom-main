import { cookies } from 'next/headers';
import {
  onboardingCookieName,
  parseOnboardingFlags,
  type OnboardingFlags,
} from '../onboarding';

/** Server-component read of the per-user onboarding cookie. */
export function readOnboardingFlagsServer(userUlid: string): OnboardingFlags {
  const raw = cookies().get(onboardingCookieName(userUlid))?.value;
  return parseOnboardingFlags(raw);
}
