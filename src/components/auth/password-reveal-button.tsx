"use client";

type PasswordRevealButtonProps = {
  passwordVisible: boolean;
  onToggle: () => void;
  /** Short phrase for aria-label, e.g. "password" or "current password" */
  accessibleName: string;
  disabled?: boolean;
  variant?: "auth" | "dashboard";
};

const variantClasses: Record<NonNullable<PasswordRevealButtonProps["variant"]>, string> = {
  auth: "absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-md p-1.5 text-[#6c7a78] transition hover:bg-[#e0e3e5]/80 hover:text-[var(--app-text)] disabled:cursor-not-allowed disabled:opacity-60",
  dashboard:
    "absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-md p-1.5 text-[var(--app-text-muted)] transition hover:bg-[var(--app-input-focus-bg)] hover:text-[var(--app-text)] disabled:cursor-not-allowed disabled:opacity-60",
};

/**
 * Use beside any password `<input>` with `pr-12` (auth) or matching right padding (dashboard)
 * so the control does not overlap typed text.
 */
export function PasswordRevealButton({
  passwordVisible,
  onToggle,
  accessibleName,
  disabled = false,
  variant = "auth",
}: PasswordRevealButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={variantClasses[variant]}
      aria-label={passwordVisible ? `Hide ${accessibleName}` : `Show ${accessibleName}`}
    >
      <span className="material-symbols-outlined notranslate text-xl">
        {passwordVisible ? "visibility_off" : "visibility"}
      </span>
    </button>
  );
}
