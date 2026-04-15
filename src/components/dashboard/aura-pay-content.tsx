"use client";

import { useDashboardWorkspaceAccess } from "@/components/dashboard/dashboard-workspace";
import { MissingCapabilityNotice } from "@/components/dashboard/missing-capability-notice";
import { hasCapability } from "@/lib/rbac/capabilities";

export function AuraPayContent() {
  const workspace = useDashboardWorkspaceAccess();
  const canPay = hasCapability(workspace.capabilities, "pay");

  if (!canPay) {
    return (
      <div className="px-4 py-10 sm:px-8">
        <div className="mx-auto max-w-[1280px] space-y-8">
          <div className="space-y-2">
            <h1 className="font-[family-name:var(--font-manrope)] text-3xl font-bold text-[#191c1e]">Aura Pay</h1>
            <p className="text-[#3c4948]">
              Payments workspace for AuraPharma — connect modules to show live transaction and payout data.
            </p>
          </div>
          <MissingCapabilityNotice capability="pay" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-[1280px]">
        <h1 className="font-[family-name:var(--font-manrope)] text-3xl font-bold text-[#191c1e]">Aura Pay</h1>
        <p className="mt-2 text-[#3c4948]">Payments workspace — connect modules to show live data.</p>
      </div>
    </div>
  );
}
