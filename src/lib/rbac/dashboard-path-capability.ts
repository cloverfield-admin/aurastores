import { ROUTES } from "@/lib/routes";
import type { MembershipCapability } from "@/lib/rbac/capabilities";

/**
 * Primary app capability enforced by API for the current dashboard path (if any).
 * Used for access messaging when the user opens a module URL directly without permission.
 */
export function dashboardModuleCapabilityForPath(pathname: string): MembershipCapability | null {
  if (pathname === ROUTES.dashboard.stock || pathname.startsWith(`${ROUTES.dashboard.stock}/`)) {
    return "stock";
  }
  if (pathname === ROUTES.dashboard.sales || pathname.startsWith(`${ROUTES.dashboard.sales}/`)) {
    return "sales";
  }
  if (pathname === ROUTES.dashboard.insights || pathname.startsWith(`${ROUTES.dashboard.insights}/`)) {
    return "insights";
  }
  if (
    pathname === ROUTES.dashboard.productCategories
    || pathname.startsWith(`${ROUTES.dashboard.productCategories}/`)
  ) {
    return "catalog";
  }
  if (pathname === ROUTES.dashboard.staff || pathname.startsWith(`${ROUTES.dashboard.staff}/`)) {
    return "staff";
  }
  if (pathname === ROUTES.dashboard.pay || pathname.startsWith(`${ROUTES.dashboard.pay}/`)) {
    return "pay";
  }
  if (
    pathname === ROUTES.dashboard.organization
    || pathname.startsWith(`${ROUTES.dashboard.organization}/`)
  ) {
    return "organization";
  }
  return null;
}
