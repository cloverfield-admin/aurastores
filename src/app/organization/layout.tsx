import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAppContext } from "@/lib/auth/session";
import { canManageSubscription } from "@/lib/rbac/subscription-access";
import { ROUTES } from "@/lib/routes";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * The one tenant-facing group on the web.
 *
 * A top-level route, NOT under /dashboard: `src/proxy.ts` redirects that whole tree
 * to /admin, so anything built there is unreachable. Everything else about the
 * "web app is the platform console" decision still holds — this group exists only
 * so an owner can pay for their plan on a real screen, and should stay that narrow.
 *
 * Unlike /admin this gate is `membership.role`, not `isPlatformAdmin`: the people
 * who belong here are store staff, not platform staff. It is also not the security
 * boundary — the engine re-checks the role on every write (see the RequireRole guard
 * on the downgrade routes in router.go).
 */
export default async function OrganizationLayout({ children }: { children: React.ReactNode }) {
  const context = await requireAppContext();

  if (!canManageSubscription(context.membership.role)) {
    // Platform admins are sent here too. They have no store plan to manage, and
    // /admin is where their own work lives.
    redirect(context.isPlatformAdmin ? ROUTES.admin.root : ROUTES.auth.webAdminOnly);
  }

  return <>{children}</>;
}
