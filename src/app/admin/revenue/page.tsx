import type { Metadata } from "next";
import { AdminRevenueContent } from "@/components/admin/admin-revenue-content";

export const metadata: Metadata = {
  title: "Revenue · AuraStores Admin",
  description: "Subscription revenue and invoice health.",
};

export default function AdminRevenuePage() {
  return <AdminRevenueContent />;
}
