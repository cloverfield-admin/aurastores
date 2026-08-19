import type { Metadata } from "next";
import { BillingSignInContent } from "@/components/billing/billing-sign-in-content";

export const metadata: Metadata = {
  title: "Billing sign-in · AuraStores",
  description: "Sign in to manage your AuraStores plan.",
  robots: { index: false, follow: false },
};

export default function BillingSignInPage() {
  return <BillingSignInContent />;
}
