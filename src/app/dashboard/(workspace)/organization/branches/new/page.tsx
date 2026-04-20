import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NewBranchContent } from "@/components/dashboard/branches/new-branch-content";
import { requireAppContext } from "@/lib/auth/session";
import { ROUTES } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Organization · New Branch",
  description: "Create a new pharmacy branch for your organization.",
};

export default async function NewOrganizationBranchPage() {
  const context = await requireAppContext();
  if (context.membership.role !== "owner") {
    redirect(ROUTES.dashboard.main);
  }
  return <NewBranchContent />;
}

