import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAppContext } from "@/lib/auth/session";
import { ROUTES } from "@/lib/routes";
import { BranchEditContent } from "@/components/dashboard/branches/branch-edit-content";

export const metadata: Metadata = {
  title: "Organization · Edit Branch",
  description: "Edit branch details and operating hours.",
};

export default async function BranchEditPage({ params }: { params: Promise<{ branchId: string }> }) {
  const context = await requireAppContext();
  if (context.membership.role !== "owner") {
    redirect(ROUTES.dashboard.main);
  }
  const { branchId } = await params;
  return <BranchEditContent branchId={branchId} />;
}

