import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminPricingContent } from "@/components/dashboard/admin-pricing-content";
import { requireAppContext } from "@/lib/auth/session";
import { ROUTES } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Admin · Pricing",
  description: "Manage subscription plans and pricing.",
};

export default async function AdminPricingPage() {
  const context = await requireAppContext();
  if (context.membership.role !== "aurapharma_admin") {
    redirect(ROUTES.dashboard.main);
  }
  return <AdminPricingContent />;
}

