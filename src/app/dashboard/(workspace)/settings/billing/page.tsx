import type { Metadata } from "next";
import { requireAppContext } from "@/lib/auth/session";
import { BillingPortalContent } from "@/components/dashboard/billing-portal-content";

export const metadata: Metadata = {
  title: "Billing",
  description: "Manage your plan, invoices, and payments.",
};

export default async function BillingPortalPage() {
  await requireAppContext();
  return <BillingPortalContent />;
}

