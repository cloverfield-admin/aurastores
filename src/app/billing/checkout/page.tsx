import type { Metadata } from "next";
import { Suspense } from "react";
import { BillingCheckoutContent } from "@/components/billing/billing-checkout-content";

export const metadata: Metadata = {
  title: "Checkout · AuraStores",
  description: "Renew or upgrade your AuraStores plan.",
  robots: { index: false, follow: false },
};

/**
 * `useSearchParams` opts a client component into request-time rendering, so the
 * Suspense boundary is required — without it the whole route is forced dynamic.
 */
export default function BillingCheckoutPage() {
  return (
    <Suspense fallback={null}>
      <BillingCheckoutContent />
    </Suspense>
  );
}
