"use client";

import Link from "next/link";
import { AuraAvatar } from "@/components/ui/aura-avatar";
import { ONBOARDING_STEPS, onboardingStepIndex } from "./onboarding-steps";
import { useOnboardingProgress } from "./onboarding-progress-provider";
import type { OnboardingStepId } from "./types";

/** Header subtitle overrides keyed by step. */
const REVIEW_PORTAL_HEADER_TITLE: Partial<Record<OnboardingStepId, string>> = {
  review: "Final Validation",
};

type ReviewPortalShellProps = {
  children: React.ReactNode;
  activeStep?: OnboardingStepId;
};

export function ReviewPortalShell({
  children,
  activeStep = "review",
}: ReviewPortalShellProps) {
  const activeIdx = onboardingStepIndex(activeStep);
  const activeMeta = ONBOARDING_STEPS[activeIdx];
  const stepCount = ONBOARDING_STEPS.length;
  const { furthestStepIndex } = useOnboardingProgress();

  return (
    <div className="aura-landing relative min-h-dvh bg-[#f7f9fb] text-[#191c1e]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden h-full w-64 flex-col justify-between border-r border-[#f1f5f9] bg-[#f8fafc] px-4 py-8 lg:flex">
        <div>
          <Link href="/" className="flex items-center gap-3 px-4 pb-10">
            <div
              className="flex size-10 items-center justify-center rounded-xl shadow-md"
              style={{
                background:
                  "linear-gradient(135deg, rgb(15, 185, 177) 0%, rgb(99, 102, 241) 100%)",
              }}
            >
              <span className="material-symbols-outlined notranslate text-xl text-white">
                local_pharmacy
              </span>
            </div>
            <div>
              <p className="font-[family-name:var(--font-manrope)] text-xl font-bold tracking-tight text-[#0d9488]">
                AuraPharma
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
                Onboarding Portal
              </p>
            </div>
          </Link>

          <nav className="relative space-y-1 px-2" aria-label="Onboarding steps">
            {ONBOARDING_STEPS.map((step) => {
              const stepIdx = onboardingStepIndex(step.id);
              const isActive = step.id === activeStep;
              const locked = stepIdx > furthestStepIndex;
              const isComplete = stepIdx < furthestStepIndex;

              if (locked) {
                return (
                  <span
                    key={step.id}
                    className="flex cursor-not-allowed items-center gap-3 rounded-lg px-4 py-3 text-[#94a3b8]"
                    title="Complete the previous steps first"
                  >
                    <span className="material-symbols-outlined notranslate text-lg">lock</span>
                    <span className="font-[family-name:var(--font-manrope)] text-sm font-medium">
                      {step.label}
                    </span>
                  </span>
                );
              }

              if (isActive) {
                return (
                  <Link
                    key={step.id}
                    href={step.href}
                    aria-current="page"
                    className="flex items-center gap-3 rounded-lg bg-white px-4 py-3 shadow-sm"
                  >
                    <span className="material-symbols-outlined notranslate text-lg text-[#0f766e]">
                      {step.icon}
                    </span>
                    <span className="font-[family-name:var(--font-manrope)] text-sm font-semibold text-[#0f766e]">
                      {step.label}
                    </span>
                  </Link>
                );
              }
              return (
                <Link
                  key={step.id}
                  href={step.href}
                  className="flex items-center gap-3 rounded-lg px-4 py-3 text-[#64748b] transition hover:bg-white/60"
                >
                  {isComplete ? (
                    <span className="material-symbols-outlined notranslate text-lg text-[#0d9488]">
                      check_circle
                    </span>
                  ) : (
                    <span className="material-symbols-outlined notranslate text-lg text-[#94a3b8]">
                      {step.icon}
                    </span>
                  )}
                  <span className="font-[family-name:var(--font-manrope)] text-sm font-medium">
                    {step.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="px-2">
          <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-tight text-[#94a3b8]">
              Onboarding Score
            </p>
            <p className="mt-1 font-[family-name:var(--font-manrope)] text-2xl font-bold text-[#006a65]">
              100%
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#f1f5f9]">
              <div
                className="h-full w-full rounded-full"
                style={{
                  background:
                    "linear-gradient(135deg, rgb(15, 185, 177) 0%, rgb(99, 102, 241) 100%)",
                }}
              />
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-[#64748b]">
              Ready for deployment into the AuraPharma network.
            </p>
          </div>
        </div>
      </aside>

      {/* Header (main area only) */}
      <header className="fixed left-0 right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-[#f1f5f9] bg-white/80 px-4 backdrop-blur-md sm:px-8 lg:left-64">
        <div className="flex items-center gap-6">
          <span className="font-[family-name:var(--font-manrope)] text-sm font-medium text-[#94a3b8]">
            Step {activeIdx + 1} of {stepCount}
          </span>
          <span className="h-4 w-px bg-[#e2e8f0]" aria-hidden />
          <span className="font-[family-name:var(--font-manrope)] text-sm font-bold text-[#1e293b]">
            {REVIEW_PORTAL_HEADER_TITLE[activeStep] ??
              activeMeta?.label ??
              "Onboarding"}
          </span>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden items-center gap-4 sm:flex">
            <Link
              href="#"
              className="font-[family-name:var(--font-manrope)] text-sm font-medium text-[#475569] hover:text-[#0f172a]"
            >
              Support
            </Link>
            <Link
              href="#"
              className="font-[family-name:var(--font-manrope)] text-sm font-medium text-[#475569] hover:text-[#0f172a]"
            >
              Guidelines
            </Link>
          </div>
          <div className="flex items-center gap-3 border-l border-transparent pl-2 sm:border-[#e2e8f0] sm:pl-6">
            <button
              type="button"
              className="rounded-lg p-1 text-[#475569] hover:bg-slate-100"
              aria-label="Notifications"
            >
              <span className="material-symbols-outlined notranslate text-xl">
                notifications
              </span>
            </button>
            <button
              type="button"
              className="rounded-lg p-1 text-[#475569] hover:bg-slate-100"
              aria-label="Help"
            >
              <span className="material-symbols-outlined notranslate text-xl">help</span>
            </button>
            <AuraAvatar
              name="Onboarding Lead"
              decorative
              className="ml-1 size-8 rounded-full text-xs"
            />
          </div>
        </div>
      </header>

      <main className="relative z-0 pt-16 lg:pl-64">
        <div className="mx-auto max-w-[1024px] px-6 py-10 pb-24 lg:px-10">{children}</div>
      </main>
    </div>
  );
}
