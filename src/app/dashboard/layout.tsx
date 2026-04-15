import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentAppContext, requireSupabaseUser } from "@/lib/auth/session";
import { isSupabaseEmailVerified } from "@/lib/auth/supabase-email-verified";
import type { DashboardWorkspaceAccess } from "@/components/dashboard/dashboard-workspace";
import { fullCapabilities } from "@/lib/rbac/capabilities";
import { formatMembershipRole } from "@/lib/membership-display";
import { loadAccessibleBranchTabs } from "@/lib/rbac/workspace-branches";
import { ROUTES } from "@/lib/routes";
import { DashboardLayoutShell } from "@/components/dashboard/dashboard-layout-shell";
import { getUserAvatarPublicUrl } from "@/lib/supabase/user-avatar-public-url";
import { DEFAULT_USER_PREFERENCES } from "@/lib/validation/me";

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

  const appContext = await getCurrentAppContext();
  const prefs = appContext?.user.preferences;
  const initialTheme = prefs?.theme ?? DEFAULT_USER_PREFERENCES.theme;

  const workspaceAccess: DashboardWorkspaceAccess = appContext
    ? {
        capabilities: appContext.capabilities,
        allowedBranchIds: appContext.allowedBranchIds,
        accessibleBranches: await loadAccessibleBranchTabs(appContext),
        userDisplayName: appContext.user.fullName?.trim() || appContext.user.email || "User",
        membershipRoleLabel: formatMembershipRole(appContext.membership.role),
        userAvatarUrl: appContext.user.avatarStorageKey
          ? getUserAvatarPublicUrl(appContext.user.avatarStorageKey)
          : null,
        initialTheme,
      }
    : {
        capabilities: fullCapabilities(),
        allowedBranchIds: [],
        accessibleBranches: [],
        userDisplayName: user.email ?? "User",
        membershipRoleLabel: "—",
        userAvatarUrl: null,
        initialTheme,
      };

  return <DashboardLayoutShell workspaceAccess={workspaceAccess}>{children}</DashboardLayoutShell>;
}
