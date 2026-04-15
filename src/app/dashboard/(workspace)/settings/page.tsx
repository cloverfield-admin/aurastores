import type { Metadata } from "next";
import { requireAppContext } from "@/lib/auth/session";
import { UserProfileSettingsContent } from "@/components/dashboard/user-profile-settings-content";
import type { MeResponse } from "@/lib/queries/me";
import type { AuthContext } from "@/lib/repositories/auth/auth.repository";
import { getUserAvatarPublicUrl } from "@/lib/supabase/user-avatar-public-url";
import { DEFAULT_USER_PREFERENCES } from "@/lib/validation/me";

export const metadata: Metadata = {
  title: "Profile & Settings",
  description: "Manage your account, profile, and preferences.",
};

function mePlaceholderFromContext(context: AuthContext): MeResponse {
  const { user, membership, capabilities, allowedBranchIds } = context;
  return {
    capabilities,
    allowedBranchIds,
    role: membership.role,
    fullName: user.fullName,
    phone: user.phone ?? null,
    email: user.email,
    preferences: { ...DEFAULT_USER_PREFERENCES, ...(user.preferences ?? {}) },
    avatarUrl: user.avatarStorageKey ? getUserAvatarPublicUrl(user.avatarStorageKey) : null,
    avatarStorageKey: user.avatarStorageKey ?? null,
  };
}

export default async function SettingsPage() {
  const context = await requireAppContext();
  return <UserProfileSettingsContent context={context} mePlaceholder={mePlaceholderFromContext(context)} />;
}
