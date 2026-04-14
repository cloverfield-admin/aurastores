import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAppContext } from "@/lib/auth/session";
import { UserProfileSettingsContent } from "@/components/dashboard/user-profile-settings-content";
import { hasCapability } from "@/lib/rbac/capabilities";
import { ROUTES } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Profile & Settings",
  description: "Manage your account, profile, and preferences.",
};

export default async function SettingsPage() {
  const context = await requireAppContext();
  if (!hasCapability(context.capabilities, "settings")) {
    redirect(ROUTES.dashboard.main);
  }
  return <UserProfileSettingsContent context={context} />;
}
