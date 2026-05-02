import type { Metadata } from "next";
import { AuraPayContent } from "@/components/dashboard/aura-pay-content";

export const metadata: Metadata = {
  title: "Aura Pay",
  description:
    "Payments workspace for AuraStores — connect modules to show live transaction and payout data.",
};

export default function AuraPayPage() {
  return <AuraPayContent />;
}
