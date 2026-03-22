import { requireSupabaseUser } from "@/lib/auth/session";
import { DashboardLayoutShell } from "@/components/dashboard/dashboard-layout-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSupabaseUser();
  return <DashboardLayoutShell>{children}</DashboardLayoutShell>;
}
