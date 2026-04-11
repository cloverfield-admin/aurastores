import type { CSSProperties } from "react";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    const w = parts[0]!;
    return w.slice(0, 2).toUpperCase();
  }
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

function hashName(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

const GRADIENTS = [
  "linear-gradient(135deg, #0fb9b1 0%, #6366f1 100%)",
  "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
  "linear-gradient(135deg, #0d9488 0%, #3b82f6 100%)",
  "linear-gradient(135deg, #14b8a6 0%, #8b5cf6 100%)",
  "linear-gradient(135deg, #0891b2 0%, #6366f1 100%)",
] as const;

type AuraAvatarProps = {
  name: string;
  className?: string;
  textClassName?: string;
  style?: CSSProperties;
  /** Accessible label when not decorative; defaults to `Avatar for {name}`. */
  "aria-label"?: string;
  /** Hide from assistive tech when a parent (e.g. link) already names the control. */
  decorative?: boolean;
};

export function AuraAvatar({
  name,
  className = "",
  textClassName = "",
  style,
  "aria-label": ariaLabel,
  decorative = false,
}: AuraAvatarProps) {
  const initials = initialsFromName(name);
  const background = GRADIENTS[hashName(name) % GRADIENTS.length];
  const a11y = decorative
    ? { "aria-hidden": true as const }
    : ({ role: "img" as const, "aria-label": ariaLabel ?? `Avatar for ${name}` } as const);
  return (
    <div
      {...a11y}
      className={`flex shrink-0 items-center justify-center font-[family-name:var(--font-manrope)] font-bold text-white ${className}`}
      style={{ background, ...style }}
    >
      <span className={textClassName}>{initials}</span>
    </div>
  );
}
