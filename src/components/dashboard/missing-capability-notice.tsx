"use client";

import type { MembershipCapability } from "@/lib/rbac/capabilities";
import { membershipCapabilityLabel } from "@/lib/rbac/capabilities";

type MissingCapabilityNoticeProps = {
  capability: MembershipCapability;
  className?: string;
  /** `inline` for compact areas (e.g. branch strip); `panel` for full-width page blocks. */
  variant?: "panel" | "inline";
};

export function MissingCapabilityNotice({
  capability,
  className = "",
  variant = "panel",
}: MissingCapabilityNoticeProps) {
  const label = membershipCapabilityLabel(capability);
  const prose = (
    <>
      You do not have access to <span className="font-semibold text-[var(--app-text)]">{label}</span>. An organization owner or
      admin can update your permissions in the staff directory (Staff management).
    </>
  );

  if (variant === "inline") {
    return (
      <p role="status" className={`text-sm leading-relaxed text-[var(--app-text-muted)] ${className}`}>
        {prose}
      </p>
    );
  }

  return (
    <div
      role="status"
      className={`rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-[var(--app-shadow-card)] ${className}`}
    >
      <p className="text-sm leading-relaxed text-[var(--app-text-secondary)]">{prose}</p>
    </div>
  );
}
