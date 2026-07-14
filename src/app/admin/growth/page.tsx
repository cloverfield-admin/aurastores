import type { Metadata } from "next";
import { AdminGrowthContent } from "@/components/admin/admin-growth-content";

export const metadata: Metadata = {
  title: "Growth · AuraStores Admin",
  description: "Signups, onboarding funnel and conversion.",
};

export default function AdminGrowthPage() {
  return <AdminGrowthContent />;
}
