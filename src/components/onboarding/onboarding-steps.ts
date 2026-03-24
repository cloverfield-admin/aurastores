import { ROUTES } from "@/lib/routes";
import type { OnboardingStepId } from "./types";

export type OnboardingStepConfig = {
  id: OnboardingStepId;
  label: string;
  icon: string;
  href: string;
};

export const ONBOARDING_STEPS: OnboardingStepConfig[] = [
  {
    id: "identity",
    label: "Identity",
    icon: "badge",
    href: ROUTES.dashboard.onboarding.root,
  },
  {
    id: "pharmacy-details",
    label: "Pharmacy Details",
    icon: "storefront",
    href: ROUTES.dashboard.onboarding.pharmacyDetails,
  },
  {
    id: "license",
    label: "License Upload",
    icon: "upload_file",
    href: ROUTES.dashboard.onboarding.license,
  },
  {
    id: "review",
    label: "Review",
    icon: "fact_check",
    href: ROUTES.dashboard.onboarding.review,
  },
];

/** 0-based position in the onboarding flow. */
export function onboardingStepIndex(id: OnboardingStepId): number {
  const i = ONBOARDING_STEPS.findIndex((s) => s.id === id);
  return i === -1 ? 0 : i;
}
