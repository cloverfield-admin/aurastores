import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireSupabaseUser } from "@/lib/auth/session";
import { services } from "@/lib/di";
import { ROUTES } from "@/lib/routes";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * The store dashboard is CLOSED.
 *
 * The web app is the AuraStores platform console; store owners and staff run their
 * business from the mobile app. Nothing under /dashboard renders any more.
 *
 * `src/proxy.ts` already redirects every /dashboard/** request to /admin before a
 * page can render, so this layout is a BACKSTOP — it exists so the dashboard stays
 * closed even if the proxy matcher is narrowed later, and so the closure is stated
 * in the route tree itself rather than only in middleware someone might not read.
 *
 * The pages and components below are intentionally left in place rather than
 * deleted: the Next→Go cutover is still in flight, and they are the reference for
 * what the tenant API has to keep serving.
 */
export default async function DashboardLayout() {
  const user = await requireSupabaseUser();
  const isPlatformAdmin = await services.auth.isPlatformAdmin(user.id);
  redirect(isPlatformAdmin ? ROUTES.admin.root : ROUTES.auth.webAdminOnly);
}
