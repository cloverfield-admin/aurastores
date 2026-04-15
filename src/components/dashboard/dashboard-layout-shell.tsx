"use client";

import { usePathname } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DashboardThemeSync } from "@/components/dashboard/dashboard-theme-sync";
import type { DashboardWorkspaceAccess } from "@/components/dashboard/dashboard-workspace";
import { DashboardWorkspaceProvider } from "@/components/dashboard/dashboard-workspace";
import { ROUTES } from "@/lib/routes";

export type { DashboardWorkspaceAccess } from "@/components/dashboard/dashboard-workspace";

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
    return (
      <>
        <DashboardThemeSync initialTheme={workspaceAccess.initialTheme} />
        {children}
      </>
    );
  }

  return (
    <DashboardWorkspaceProvider value={workspaceAccess}>
      <DashboardThemeSync initialTheme={workspaceAccess.initialTheme} />
      <DashboardShell workspaceAccess={workspaceAccess}>{children}</DashboardShell>
    </DashboardWorkspaceProvider>
  );
}
