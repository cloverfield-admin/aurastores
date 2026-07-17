import type { Metadata } from "next";
import { SubscriptionContent } from "@/components/organization/subscription-content";

export const metadata: Metadata = {
  title: "Subscription · AuraStores",
  description: "Manage your AuraStores plan.",
  robots: { index: false, follow: false },
};

export default function OrganizationSubscriptionPage() {
  return <SubscriptionContent />;
}
