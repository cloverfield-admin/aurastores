"use client";

import { usePathname } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ROUTES } from "@/lib/routes";

export function DashboardLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isOnboarding = pathname === ROUTES.dashboard.onboarding.root
    || pathname.startsWith(`${ROUTES.dashboard.onboarding.root}/`);

  if (isOnboarding) {
    return <>{children}</>;
  }

  return <DashboardShell>{children}</DashboardShell>;
}
