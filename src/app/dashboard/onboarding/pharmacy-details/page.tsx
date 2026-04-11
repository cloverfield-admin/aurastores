import type { Metadata } from "next";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { PharmacyDetailsStepForm } from "@/components/onboarding/steps/pharmacy-details-step-form";

export const metadata: Metadata = {
  title: "Onboarding — Main branch setup",
  description:
    "Configure your primary branch, location, and operating hours for Aura Sync.",
};

export default function OnboardingPharmacyDetailsPage() {
  return (
    <OnboardingShell
      activeStep="pharmacy-details"
      contentMaxWidthClass="max-w-4xl xl:max-w-[56rem]"
      saveProgressVariant="outline"
      scoreProgressPercent={50}
    >
      <PharmacyDetailsStepForm />
    </OnboardingShell>
  );
}
