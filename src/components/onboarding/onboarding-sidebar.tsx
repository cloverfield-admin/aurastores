"use client";

import Link from "next/link";
import { ONBOARDING_STEPS, onboardingStepIndex } from "./onboarding-steps";
import { useOnboardingProgress } from "./onboarding-progress-provider";
import { SaveProgressButton } from "./save-progress-button";
import type { OnboardingStepId } from "./types";

type OnboardingSidebarProps = {
  activeStep: OnboardingStepId;
  saveProgressVariant?: "gradient" | "outline";
  variant?: "default" | "clinical";
};

export function OnboardingSidebar({
  activeStep,
  saveProgressVariant = "gradient",
  variant = "default",
}: OnboardingSidebarProps) {
  const { furthestStepIndex } = useOnboardingProgress();

  function stepRow(
    step: (typeof ONBOARDING_STEPS)[number],
    clinical: boolean,
  ) {
    const stepIdx = onboardingStepIndex(step.id);
    const isActive = step.id === activeStep;
    const locked = stepIdx > furthestStepIndex;
    const isComplete = stepIdx < furthestStepIndex;

    if (locked) {
      const clinicalLocked =
        "flex cursor-not-allowed items-center gap-3 py-3 pl-6 pr-4 text-sm tracking-wide text-[var(--app-text-faint)]";
      const defaultLocked =
        "flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[var(--app-text-faint)]";
      return (
        <span
          key={step.id}
          className={clinical ? clinicalLocked : defaultLocked}
          title="Complete the previous steps first"
        >
          <span className="material-symbols-outlined notranslate text-xl">lock</span>
          <span className={clinical ? "font-normal" : ""}>{step.label}</span>
        </span>
      );
    }

    if (clinical) {
      return (
        <div key={step.id} className={isActive ? "pl-1 pr-0" : ""}>
          <Link
            href={step.href}
            aria-current={isActive ? "page" : undefined}
            className={`flex items-center gap-3 py-3 pl-6 pr-4 text-sm tracking-wide transition ${
              isActive
                ? "rounded-r-full bg-white font-bold text-[var(--app-link-teal)] shadow-sm"
                : "text-[var(--app-text-muted)] hover:bg-[var(--app-surface-subtle)]/90"
            }`}
          >
            <span
              className={`material-symbols-outlined notranslate text-xl ${
                isActive
                  ? "text-[var(--app-link-teal)]"
                  : isComplete
                    ? "text-[var(--app-link-teal)]"
                    : "text-[var(--app-text-muted)]"
              }`}
            >
              {isComplete && !isActive ? "check_circle" : step.icon}
            </span>
            <span className={isActive ? "font-bold" : "font-normal"}>{step.label}</span>
          </Link>
        </div>
      );
    }

    return (
      <Link
        key={step.id}
        href={step.href}
        aria-current={isActive ? "page" : undefined}
        className={`flex items-center gap-3 px-3 py-2 text-sm font-medium transition ${
          isActive
            ? "rounded-2xl bg-[#f0fdfa] text-[var(--app-link-teal)]"
            : "rounded-lg text-[var(--app-text-muted)] hover:bg-[var(--app-surface-subtle)]"
        }`}
      >
        <span
          className={`material-symbols-outlined notranslate text-lg ${
            isActive ? "text-[var(--app-link-teal)]" : isComplete ? "text-[var(--app-link-teal)]" : "text-[var(--app-text-muted)]"
          }`}
        >
          {isComplete && !isActive ? "check_circle" : step.icon}
        </span>
        {step.label}
      </Link>
    );
  }

  if (variant === "clinical") {
    return (
      <aside className="flex w-full shrink-0 flex-col justify-between border-b border-[rgba(226,232,240,0.5)] bg-[var(--app-surface-muted)] px-0 py-4 lg:h-[calc(100dvh-4rem)] lg:w-64 lg:border-b-0 lg:border-r lg:pt-8 lg:pb-8">
        <div>
          <div className="px-6 pb-8">
            <h2 className="font-[family-name:var(--font-manrope)] text-lg font-bold text-[var(--app-link-teal)]">
              Onboarding
            </h2>
            <p className="mt-1 text-xs text-[var(--app-text-muted)]">Setup your clinical suite</p>
          </div>
          <nav className="flex flex-col gap-1 pl-0" aria-label="Onboarding steps">
            {ONBOARDING_STEPS.map((step) => stepRow(step, true))}
          </nav>
        </div>
        <div className="mt-8 space-y-4 px-6 pt-4">
          <div className="rounded-xl border border-[rgba(204,251,241,0.5)] bg-[#f0fdfa] p-4">
            <p className="text-xs font-medium text-[#115e59]">Need Help?</p>
            <p className="mt-2 text-[10px] leading-relaxed text-[var(--app-link-teal)]">
              Our clinical support team is available 24/7 for verification assistance.
            </p>
          </div>
          <Link
            href="#"
            className="flex items-center gap-3 py-2 text-sm text-[var(--app-text-muted)] hover:text-[var(--app-header-title)]"
          >
            <span className="material-symbols-outlined notranslate text-lg">settings</span>
            Settings
          </Link>
          <Link
            href="#"
            className="flex items-center gap-3 py-2 text-sm text-[var(--app-text-muted)] hover:text-[var(--app-header-title)]"
          >
            <span className="material-symbols-outlined notranslate text-lg">support_agent</span>
            Support
          </Link>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex w-full shrink-0 flex-col justify-between border-b border-[var(--app-surface-subtle)] bg-[var(--app-surface-muted)] px-4 py-4 lg:h-[calc(100dvh-4rem)] lg:w-64 lg:border-b-0 lg:border-r">
      <div>
        <div className="px-3 pb-8 pt-2">
          <h2 className="text-lg font-semibold text-[var(--app-header-title)]">Onboarding</h2>
          <p className="mt-0.5 text-xs text-[var(--app-text-muted)]">Setup your pharmacy</p>
        </div>
        <nav className="flex flex-col gap-1" aria-label="Onboarding steps">
          {ONBOARDING_STEPS.map((step) => stepRow(step, false))}
        </nav>
      </div>
      <div className="mt-8 space-y-4 border-t border-[var(--app-border-ui)] pt-4 lg:mt-0">
        <Link
          href="#"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[var(--app-text-muted)] hover:bg-[var(--app-surface-subtle)]"
        >
          <span className="material-symbols-outlined notranslate text-lg text-[var(--app-text-muted)]">
            help
          </span>
          Help Center
        </Link>
        <SaveProgressButton variant={saveProgressVariant} />
      </div>
    </aside>
  );
}
