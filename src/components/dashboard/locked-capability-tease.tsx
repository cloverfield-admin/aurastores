"use client";

import Link from "next/link";
import { useDashboardWorkspaceAccess } from "@/components/dashboard/dashboard-workspace";
import type { MembershipCapability } from "@/lib/rbac/capabilities";
import { membershipCapabilityLabel } from "@/lib/rbac/capabilities";
import { ROUTES } from "@/lib/routes";

export function LockedCapabilityTease({
  capability,
  children,
  className = "",
}: {
  capability: MembershipCapability;
  children: React.ReactNode;
  className?: string;
}) {
  const workspace = useDashboardWorkspaceAccess();
  const label = membershipCapabilityLabel(capability);
  const isOwner = workspace.membershipRole === "owner";

  return (
    <div className={`relative ${className}`}>
      <div className="pointer-events-none select-none opacity-60 blur-[0.2px]">{children}</div>

      <div className="absolute inset-0 z-10 flex items-start justify-center px-4 pt-10 sm:pt-16">
        <div className="aura-card-tint w-full max-w-xl rounded-2xl border p-5 shadow-[var(--app-shadow-card)]">
          <div className="flex items-start gap-3">
            <div className="aura-icon flex size-10 shrink-0 items-center justify-center rounded-xl">
              <span className="material-symbols-outlined notranslate text-xl">lock</span>
            </div>
            <div className="min-w-0">
              <p className="font-[family-name:var(--font-manrope)] text-base font-extrabold text-[var(--app-text)]">
                {label} is locked
              </p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--app-text-secondary)]">
                This feature is visible so you can explore what you’re missing. To use it, upgrade your plan (or ask an
                organization admin to enable access).
              </p>
              <div className="mt-4 flex items-end justify-between gap-3">
                <div className="flex">
                  {isOwner ? (
                    <Link
                      href={ROUTES.billingPortal}
                      className="aura-primary-button inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition"
                    >
                      <span className="material-symbols-outlined notranslate text-base">payments</span>
                      Billing
                    </Link>
                  ) : null}
                </div>
                {!isOwner ? (
                  <a
                    href={ROUTES.marketing.pricing}
                    target="_blank"
                    rel="noreferrer"
                    className="aura-primary-button inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition"
                  >
                    <span className="material-symbols-outlined notranslate text-base">upgrade</span>
                    View plans
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

