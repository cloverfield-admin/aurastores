import { redirect } from "next/navigation";
import { requireSupabaseUser } from "@/lib/auth/session";
import { services } from "@/lib/di";
import { ROUTES } from "@/lib/routes";

/** Main dashboard routes only; onboarding lives outside this group. */
export default async function DashboardWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSupabaseUser();
  const next = await services.auth.getPostAuthRedirect(user.id);
  if (next !== ROUTES.dashboard.main) {
    redirect(next);
  }

  return <>{children}</>;
}
