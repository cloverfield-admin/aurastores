import type { Metadata } from "next";
import { Suspense } from "react";
import { BillingSignInContent } from "@/components/billing/billing-sign-in-content";

export const metadata: Metadata = {
  title: "Billing sign-in · AuraStores",
  description: "Sign in to manage your AuraStores plan.",
  robots: { index: false, follow: false },
};

/**
 * `useSearchParams` (for the `?next=` destination) opts the client component
 * into request-time rendering, so the boundary is required.
 */
export default function BillingSignInPage() {
  return (
    <Suspense fallback={null}>
      <BillingSignInContent />
    </Suspense>
  );
}
