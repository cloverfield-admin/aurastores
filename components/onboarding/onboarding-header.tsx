import Image from "next/image";
import Link from "next/link";

const PHARMACY_AVATAR =
  "https://www.figma.com/api/mcp/asset/14ce51e4-60be-4a56-944e-e881a63f4a4c";

const CLINICAL_USER_AVATAR =
  "https://www.figma.com/api/mcp/asset/e6578bfb-7698-432f-827b-76ba70e49a7d";

type OnboardingHeaderProps = {
  variant?: "default" | "clinical";
};

export function OnboardingHeader({ variant = "default" }: OnboardingHeaderProps) {
  if (variant === "clinical") {
    return (
      <header className="fixed left-0 right-0 top-0 z-50 bg-white/80 shadow-[0_1px_2px_0_rgba(19,78,74,0.05)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-4 sm:px-8">
          <Link
            href="/"
            className="font-[family-name:var(--font-manrope)] text-xl font-bold tracking-tight text-[#0d9488]"
          >
            AuraPharma
          </Link>
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="rounded-lg p-1 text-[#64748b] hover:bg-slate-100 hover:text-[#0f172a]"
              aria-label="Help"
            >
              <span className="material-symbols-outlined notranslate text-xl">help</span>
            </button>
            <button
              type="button"
              className="rounded-lg p-1 text-[#64748b] hover:bg-slate-100 hover:text-[#0f172a]"
              aria-label="Notifications"
            >
              <span className="material-symbols-outlined notranslate text-xl">
                notifications
              </span>
            </button>
            <div className="relative size-8 overflow-hidden rounded-full bg-[#e6e8ea] ring-2 ring-white">
              <Image
                src={CLINICAL_USER_AVATAR}
                alt="Account"
                fill
                className="object-cover"
                sizes="32px"
              />
            </div>
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
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-[rgba(20,184,166,0.1)] bg-white/80 shadow-[0_1px_2px_0_rgba(19,78,74,0.05)] backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="bg-gradient-to-r from-[#14b8a6] to-[#6366f1] bg-clip-text text-2xl font-semibold tracking-tight text-transparent"
        >
          AuraPharma
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="#"
            className="text-sm font-medium tracking-tight text-[#64748b] hover:text-[#0f766e]"
          >
            Support
          </Link>
          <div className="relative size-8 overflow-hidden rounded-full bg-[#e0e3e5] ring-2 ring-white">
            <Image
              src={PHARMACY_AVATAR}
              alt="Pharmacy"
              fill
              className="object-cover"
              sizes="32px"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
