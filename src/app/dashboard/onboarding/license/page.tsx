import type { Metadata } from "next";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { LicenseUploadStepForm } from "@/components/onboarding/steps/license-upload-step-form";

export const metadata: Metadata = {
  title: "Onboarding — License upload",
  description: "Upload operating licenses and verification documents for your business.",
};

export default function OnboardingLicensePage() {
  return (
    <OnboardingShell
      activeStep="license"
      variant="clinical"
      showScorePanel={false}
      contentMaxWidthClass="max-w-[1200px]"
      scoreProgressPercent={75}
    >
      <LicenseUploadStepForm />
    </OnboardingShell>
  );
}
