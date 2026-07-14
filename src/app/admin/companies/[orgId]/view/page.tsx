import type { Metadata } from "next";
import { AdminCompanyViewContent } from "@/components/admin/admin-company-view-content";

export const metadata: Metadata = {
  title: "Store view · AuraStores Admin",
  description: "Read-only view of a company's own dashboard.",
};

export default async function AdminCompanyViewPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  return <AdminCompanyViewContent orgId={orgId} />;
}
