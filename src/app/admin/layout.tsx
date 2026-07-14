import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { ImpersonationProvider } from "@/components/admin/impersonation-provider";
import { requireSupabaseUser } from "@/lib/auth/session";
import { services } from "@/lib/di";
import { ROUTES } from "@/lib/routes";

export const metadata: Metadata = {
  title: "AuraStores Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSupabaseUser();

  // Deliberately NOT `context.membership.role`. findByAuthUserId resolves ONE
  // membership (default first, then oldest), so an admin who also owns their own
  // store could present as `owner` here and be bounced out of their own console.
  // This mirrors the engine's RequirePlatformAdmin exactly: one rule, two
  // implementations, same answer.
  const isPlatformAdmin = await services.auth.isPlatformAdmin(user.id);
  if (!isPlatformAdmin) {
    // NOT to /dashboard: the dashboard is closed and the proxy redirects it here,
    // so sending a non-admin back there would bounce them between the two forever.
    redirect(ROUTES.auth.webAdminOnly);
  }

  // The page guard is not the security boundary — every engine route under
  // /api/v1/admin re-checks the role server-side. This only keeps the UI honest.
  return (
    <ImpersonationProvider>
      <AdminShell>{children}</AdminShell>
    </ImpersonationProvider>
  );
}
