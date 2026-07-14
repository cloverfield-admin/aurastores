import type { Metadata } from "next";
import { AdminPricingContent } from "@/components/admin/admin-pricing-content";

export const metadata: Metadata = {
  title: "Pricing · AuraStores Admin",
  description: "Manage subscription plan pricing.",
};

export default function AdminPricingPage() {
  return <AdminPricingContent />;
}
