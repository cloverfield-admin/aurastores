"use client";

import { useDashboardWorkspaceAccess } from "@/components/dashboard/dashboard-workspace";
import { MissingCapabilityNotice } from "@/components/dashboard/missing-capability-notice";
import { hasCapability } from "@/lib/rbac/capabilities";

export function OrganizationManagementContent() {
  const workspace = useDashboardWorkspaceAccess();
  const canManageOrg = hasCapability(workspace.capabilities, "organization");

  if (!canManageOrg) {
    return (
      <div className="px-4 pb-16 pt-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1280px] space-y-8">
          <div className="space-y-2">
            <h1 className="font-[family-name:var(--font-manrope)] text-3xl font-extrabold tracking-tight text-[var(--app-text)] sm:text-4xl">
              Organization
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-[var(--app-text-secondary)]">
              Branches, licensing, onboarding, and other organization-wide controls will appear here.
            </p>
          </div>
          <MissingCapabilityNotice capability="organization" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-16 pt-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1280px] space-y-8">
        <div className="space-y-2">
          <h1 className="font-[family-name:var(--font-manrope)] text-3xl font-extrabold tracking-tight text-[var(--app-text)] sm:text-4xl">
            Organization
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-[var(--app-text-secondary)]">
            Manage your pharmacy network, branch locations, and organization-wide policies from this workspace.
          </p>
        </div>
        <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-8 shadow-sm">
          <p className="text-sm leading-relaxed text-[var(--app-text-muted)]">
            Organization tools are not connected yet. This area will grow with branch administration, compliance, and
            billing features.
          </p>
        </div>
      </div>
    </div>
  );
}
