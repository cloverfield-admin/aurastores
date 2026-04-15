"use client";

import { useDashboardWorkspaceAccess } from "@/components/dashboard/dashboard-workspace";
import { MissingCapabilityNotice } from "@/components/dashboard/missing-capability-notice";
import { LockedCapabilityTease } from "@/components/dashboard/locked-capability-tease";
import { hasCapability } from "@/lib/rbac/capabilities";

export function AuraPayContent() {
  const workspace = useDashboardWorkspaceAccess();
  const canPay = hasCapability(workspace.capabilities, "pay");
  const locked = !canPay;

  const content = (
    <div className="px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-[1280px]">
        <h1 className="font-[family-name:var(--font-manrope)] text-3xl font-bold text-[var(--app-text)]">Aura Pay</h1>
        <p className="mt-2 text-[var(--app-text-secondary)]">Payments workspace — connect modules to show live data.</p>
      </div>
    </div>
  );

  if (!locked) {
    return content;
  }

  return (
    <LockedCapabilityTease capability="pay">
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 pb-2 pt-4 sm:px-8">
        <MissingCapabilityNotice capability="pay" variant="inline" className="max-w-3xl" />
      </div>
      {content}
    </LockedCapabilityTease>
  );
}
