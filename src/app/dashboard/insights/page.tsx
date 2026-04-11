import type { Metadata } from "next";
import { AuraInsightsContent } from "@/components/dashboard/aura-insights-content";

export const metadata: Metadata = {
  title: "Aura Insights",
  description:
    "Pharmacy network dashboard — clinical trends, AI insights, inventory heatmap, and top medications.",
};

export default function AuraInsightsPage() {
  return <AuraInsightsContent />;
}
