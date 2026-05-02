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
    <div className="aura-landing relative min-h-dvh bg-[var(--app-canvas)] text-[var(--app-text)]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden h-full w-64 flex-col justify-between border-r border-[var(--app-surface-subtle)] bg-[var(--app-surface-muted)] px-4 py-8 lg:flex">
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
              <p className="font-[family-name:var(--font-manrope)] text-xl font-bold tracking-tight text-[var(--app-link-teal)]">
                AuraStores
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--app-text-faint)]">
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
                    className="flex cursor-not-allowed items-center gap-3 rounded-lg px-4 py-3 text-[var(--app-text-faint)]"
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
                    className="flex items-center gap-3 rounded-lg bg-[var(--app-surface)] px-4 py-3 shadow-sm"
                  >
                    <span className="material-symbols-outlined notranslate text-lg text-[var(--app-link-teal)]">
                      {step.icon}
                    </span>
                    <span className="font-[family-name:var(--font-manrope)] text-sm font-semibold text-[var(--app-link-teal)]">
                      {step.label}
                    </span>
                  </Link>
                );
              }
              return (
                <Link
                  key={step.id}
                  href={step.href}
                  className="flex items-center gap-3 rounded-lg px-4 py-3 text-[var(--app-text-muted)] transition hover:bg-[var(--app-surface)]/60"
                >
                  {isComplete ? (
                    <span className="material-symbols-outlined notranslate text-lg text-[var(--app-link-teal)]">
                      check_circle
                    </span>
                  ) : (
                    <span className="material-symbols-outlined notranslate text-lg text-[var(--app-text-faint)]">
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
          <div className="relative overflow-hidden rounded-2xl bg-[var(--app-surface)] p-5 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-tight text-[var(--app-text-faint)]">
              Onboarding Score
            </p>
            <p className="mt-1 font-[family-name:var(--font-manrope)] text-2xl font-bold text-[var(--app-brand)]">
              100%
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--app-surface-subtle)]">
              <div
                className="h-full w-full rounded-full"
                style={{
                  background:
                    "linear-gradient(135deg, rgb(15, 185, 177) 0%, rgb(99, 102, 241) 100%)",
                }}
              />
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-[var(--app-text-muted)]">
              Ready for deployment into the AuraStores network.
            </p>
          </div>
        </div>
      </aside>

      {/* Header (main area only) */}
      <header className="fixed left-0 right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--app-surface-subtle)] bg-[var(--app-surface)]/80 px-4 backdrop-blur-md sm:px-8 lg:left-64">
        <div className="flex items-center gap-6">
          <span className="font-[family-name:var(--font-manrope)] text-sm font-medium text-[var(--app-text-faint)]">
            Step {activeIdx + 1} of {stepCount}
          </span>
          <span className="h-4 w-px bg-[var(--app-border-ui)]" aria-hidden />
          <span className="font-[family-name:var(--font-manrope)] text-sm font-bold text-[var(--app-header-title)]">
            {REVIEW_PORTAL_HEADER_TITLE[activeStep] ??
              activeMeta?.label ??
              "Onboarding"}
          </span>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden items-center gap-4 sm:flex">
            <Link
              href="#"
              className="font-[family-name:var(--font-manrope)] text-sm font-medium text-[var(--app-text-muted)] hover:text-[var(--app-header-title)]"
            >
              Support
            </Link>
            <Link
              href="#"
              className="font-[family-name:var(--font-manrope)] text-sm font-medium text-[var(--app-text-muted)] hover:text-[var(--app-header-title)]"
            >
              Guidelines
            </Link>
          </div>
          <div className="flex items-center gap-3 border-l border-transparent pl-2 sm:border-[var(--app-border-ui)] sm:pl-6">
            <button
              type="button"
              className="rounded-lg p-1 text-[var(--app-text-muted)] hover:bg-[var(--app-surface-subtle)]"
              aria-label="Notifications"
            >
              <span className="material-symbols-outlined notranslate text-xl">
                notifications
              </span>
            </button>
            <button
              type="button"
              className="rounded-lg p-1 text-[var(--app-text-muted)] hover:bg-[var(--app-surface-subtle)]"
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
