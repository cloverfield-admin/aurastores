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
      You do not have access to <span className="font-semibold text-[#191c1e]">{label}</span>. An organization owner or
      admin can update your permissions in the staff directory (Staff management).
    </>
  );

  if (variant === "inline") {
    return (
      <p role="status" className={`text-sm leading-relaxed text-[#64748b] ${className}`}>
        {prose}
      </p>
    );
  }

  return (
    <div
      role="status"
      className={`rounded-xl border border-[rgba(187,201,199,0.2)] bg-white p-6 shadow-sm ${className}`}
    >
      <p className="text-sm leading-relaxed text-[#3c4948]">{prose}</p>
    </div>
  );
}
