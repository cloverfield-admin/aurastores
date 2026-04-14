"use client";

import { usePathname } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ROUTES } from "@/lib/routes";
import type { MembershipCapabilities } from "@/lib/rbac/capabilities";
import type { WorkspaceBranchTab } from "@/lib/rbac/workspace-branches";

export type DashboardWorkspaceAccess = {
  capabilities: MembershipCapabilities;
  allowedBranchIds: string[] | null;
  /** Branches the user may see in the shell and home overview (RBAC-scoped). */
  accessibleBranches: WorkspaceBranchTab[];
  userDisplayName: string;
  membershipRoleLabel: string;
};

export function DashboardLayoutShell({
  children,
  workspaceAccess,
}: {
  children: React.ReactNode;
  workspaceAccess: DashboardWorkspaceAccess;
}) {
  const pathname = usePathname();
  const isOnboarding = pathname === ROUTES.dashboard.onboarding.root
    || pathname.startsWith(`${ROUTES.dashboard.onboarding.root}/`);

  if (isOnboarding) {
    return <>{children}</>;
  }

  return <DashboardShell workspaceAccess={workspaceAccess}>{children}</DashboardShell>;
}
