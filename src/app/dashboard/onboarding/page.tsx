import type { Metadata } from "next";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { IdentityStepForm } from "@/components/onboarding/steps/identity-step-form";

export const metadata: Metadata = {
  title: "Onboarding — Business identity",
  description: "Verify your business identity for compliance and account security.",
};

export default function OnboardingIdentityPage() {
  return (
    <OnboardingShell activeStep="identity">
      <IdentityStepForm />
    </OnboardingShell>
  );
}
