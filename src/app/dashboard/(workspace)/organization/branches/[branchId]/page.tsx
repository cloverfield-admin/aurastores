import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAppContext } from "@/lib/auth/session";
import { ROUTES } from "@/lib/routes";
import { BranchDetailContent } from "@/components/dashboard/branches/branch-detail-content";

export const metadata: Metadata = {
  title: "Organization · Branch",
  description: "Branch details and settings.",
};

export default async function BranchDetailPage({ params }: { params: Promise<{ branchId: string }> }) {
  const context = await requireAppContext();
  if (context.membership.role !== "owner") {
    redirect(ROUTES.dashboard.main);
  }
  const { branchId } = await params;
  return <BranchDetailContent branchId={branchId} />;
}

