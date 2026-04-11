import type { Metadata } from "next";
import { requireSupabaseUser } from "@/lib/auth/session";
import { DashboardLayoutShell } from "@/components/dashboard/dashboard-layout-shell";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSupabaseUser();
  return <DashboardLayoutShell>{children}</DashboardLayoutShell>;
}
