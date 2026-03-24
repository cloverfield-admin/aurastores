"use client";

import { usePathname, useRouter } from "next/navigation";
import { useLayoutEffect } from "react";
import { pathnameToOnboardingStepIndex } from "@/lib/onboarding-flow";
import { ONBOARDING_STEPS } from "./onboarding-steps";
import { useOnboardingProgress } from "./onboarding-progress-provider";

/**
 * Redirects away from steps the user has not unlocked yet (no skipping ahead).
 */
export function OnboardingRouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { furthestStepIndex, hydrated } = useOnboardingProgress();

  useLayoutEffect(() => {
    if (!hydrated) return;
    const current = pathnameToOnboardingStepIndex(pathname);
    if (current > furthestStepIndex) {
      const safe = ONBOARDING_STEPS[furthestStepIndex]?.href ?? ONBOARDING_STEPS[0].href;
      router.replace(safe);
    }
  }, [pathname, router, furthestStepIndex, hydrated]);

  return <>{children}</>;
}
