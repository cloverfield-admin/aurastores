import type { Metadata } from "next";
import { BillingOverviewContent } from "@/components/billing/billing-overview-content";

export const metadata: Metadata = {
  title: "Billing & plan · AuraStores",
  description: "Your AuraStores plan, renewal date and payment history.",
  robots: { index: false, follow: false },
};

export default function BillingOverviewPage() {
  return <BillingOverviewContent />;
}
