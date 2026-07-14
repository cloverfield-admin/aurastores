import type { Metadata } from "next";
import { AdminCompanyDetailContent } from "@/components/admin/admin-company-detail-content";

export const metadata: Metadata = {
  title: "Company · AuraStores Admin",
};

// Next 16: params is a Promise.
export default async function AdminCompanyPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  return <AdminCompanyDetailContent orgId={orgId} />;
}
