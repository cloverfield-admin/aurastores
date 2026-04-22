import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAppContext } from "@/lib/auth/session";
import { BillingPortalContent } from "@/components/dashboard/billing-portal-content";
import { ROUTES } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Billing",
  description: "Manage your plan, invoices, and payments.",
};

export default async function BillingPortalPage() {
  const ctx = await requireAppContext();
  if (ctx.membership.role !== "owner") {
    redirect(ROUTES.settings);
  }
  return <BillingPortalContent />;
}

