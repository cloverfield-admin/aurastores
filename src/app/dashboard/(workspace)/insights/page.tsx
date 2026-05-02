import type { Metadata } from "next";
import { AuraInsightsContent } from "@/components/dashboard/aura-insights-content";

export const metadata: Metadata = {
  title: "Aura Insights",
  description:
    "Network dashboard — sales and stock trends, AI-style summaries, inventory signals, and top products.",
};

export default function AuraInsightsPage() {
  return <AuraInsightsContent />;
}
