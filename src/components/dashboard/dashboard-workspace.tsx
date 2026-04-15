"use client";

import { createContext, useContext } from "react";
import type { UserPreferences } from "@/lib/db/schema";
import type { MembershipCapabilities } from "@/lib/rbac/capabilities";
import type { WorkspaceBranchTab } from "@/lib/rbac/workspace-branches";

export type DashboardWorkspaceAccess = {
  capabilities: MembershipCapabilities;
  allowedBranchIds: string[] | null;
  /** Branches the user may see in the shell and home overview (RBAC-scoped). */
  accessibleBranches: WorkspaceBranchTab[];
  userDisplayName: string;
  membershipRoleLabel: string;
  /** Public URL for profile photo when `users.avatar_storage_key` is set; otherwise null. */
  userAvatarUrl: string | null;
  /** Saved appearance preference from `users.preferences.theme` (for client theme sync). */
  initialTheme: UserPreferences["theme"];
};

const DashboardWorkspaceContext = createContext<DashboardWorkspaceAccess | null>(null);

export function DashboardWorkspaceProvider({
  value,
  children,
}: {
  value: DashboardWorkspaceAccess;
  children: React.ReactNode;
}) {
  return <DashboardWorkspaceContext.Provider value={value}>{children}</DashboardWorkspaceContext.Provider>;
}

export function useDashboardWorkspaceAccess(): DashboardWorkspaceAccess {
  const ctx = useContext(DashboardWorkspaceContext);
  if (!ctx) {
    throw new Error("useDashboardWorkspaceAccess must be used within DashboardWorkspaceProvider.");
  }
  return ctx;
}
