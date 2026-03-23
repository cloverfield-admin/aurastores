import type { Metadata } from "next";
import { requireAppContext } from "@/lib/auth/session";
import { UserProfileSettingsContent } from "@/components/dashboard/user-profile-settings-content";

export const metadata: Metadata = {
  title: "Profile & Settings | AuraPharma",
  description: "Manage your account, profile, and preferences.",
};

export default async function SettingsPage() {
  const context = await requireAppContext();
  return <UserProfileSettingsContent context={context} />;
}
