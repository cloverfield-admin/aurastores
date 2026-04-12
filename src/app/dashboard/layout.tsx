import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isSupabaseEmailVerified } from "@/lib/auth/supabase-email-verified";
import { requireSupabaseUser } from "@/lib/auth/session";
import { ROUTES } from "@/lib/routes";
import { DashboardLayoutShell } from "@/components/dashboard/dashboard-layout-shell";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSupabaseUser();
  if (!isSupabaseEmailVerified(user)) {
    const verifyUrl = `${ROUTES.auth.verifyEmail}?${new URLSearchParams(
      user.email ? { email: user.email } : {},
    ).toString()}`;
    redirect(verifyUrl);
  }

  return <DashboardLayoutShell>{children}</DashboardLayoutShell>;
}
