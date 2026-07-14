import { permanentRedirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

/**
 * Pricing admin moved to the platform console at /admin/pricing.
 *
 * This page is kept only to catch bookmarks: it was never linked from the nav.
 * The console's own layout re-checks that the caller is a platform admin, so the
 * old role guard here would be redundant.
 */
export default function LegacyAdminPricingPage() {
  permanentRedirect(ROUTES.admin.pricing);
}
