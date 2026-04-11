import type { Metadata } from "next";
import { ReviewPortalShell } from "@/components/onboarding/review-portal-shell";
import { ReviewStepForm } from "@/components/onboarding/steps/review-step-form";

export const metadata: Metadata = {
  title: "Onboarding — Final review",
  description:
    "Review business identity, compliance documents, and branch details before completing setup.",
};

export default function OnboardingReviewPage() {
  return (
    <ReviewPortalShell activeStep="review">
      <ReviewStepForm />
    </ReviewPortalShell>
  );
}
