import type { Metadata } from "next";
import { AdminOverviewContent } from "@/components/admin/admin-overview-content";

export const metadata: Metadata = {
  title: "Overview · AuraStores Admin",
  description: "Platform-wide metrics.",
};

export default function AdminOverviewPage() {
  return <AdminOverviewContent />;
}
