import Link from "next/link";
import { AuraAvatar } from "@/components/ui/aura-avatar";

type OnboardingHeaderProps = {
  variant?: "default" | "clinical";
};

export function OnboardingHeader({ variant = "default" }: OnboardingHeaderProps) {
  if (variant === "clinical") {
    return (
      <header className="fixed left-0 right-0 top-0 z-50 bg-[var(--app-surface)]/80 shadow-[0_1px_2px_0_rgba(19,78,74,0.05)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-4 sm:px-8">
          <Link
            href="/"
            className="font-[family-name:var(--font-manrope)] text-xl font-bold tracking-tight text-[var(--app-link-teal)]"
          >
            AuraStores
          </Link>
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="rounded-lg p-1 text-[var(--app-text-muted)] hover:bg-[var(--app-surface-subtle)] hover:text-[var(--app-header-title)]"
              aria-label="Help"
            >
              <span className="material-symbols-outlined notranslate text-xl">help</span>
            </button>
            <button
              type="button"
              className="rounded-lg p-1 text-[var(--app-text-muted)] hover:bg-[var(--app-surface-subtle)] hover:text-[var(--app-header-title)]"
              aria-label="Notifications"
            >
              <span className="material-symbols-outlined notranslate text-xl">
                notifications
              </span>
            </button>
            <AuraAvatar
              name="You"
              className="size-8 rounded-full ring-2 ring-white text-xs"
              aria-label="Account"
            />
          </div>
        </div>
        <div
          className="mx-auto h-px max-w-[1280px] bg-gradient-to-r from-[rgba(20,184,166,0.1)] to-[rgba(99,102,241,0.1)]"
          aria-hidden
        />
      </header>
    );
  }

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-[rgba(20,184,166,0.1)] bg-[var(--app-surface)]/80 shadow-[0_1px_2px_0_rgba(19,78,74,0.05)] backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="bg-gradient-to-r from-[#14b8a6] to-[#6366f1] bg-clip-text text-2xl font-semibold tracking-tight text-transparent"
        >
          AuraStores
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="#"
            className="text-sm font-medium tracking-tight text-[var(--app-text-muted)] hover:text-[var(--app-link-teal)]"
          >
            Support
          </Link>
          <AuraAvatar
            name="Demo Store"
            className="size-8 rounded-full ring-2 ring-white text-xs"
            aria-label="Account"
          />
        </div>
      </div>
    </header>
  );
}
