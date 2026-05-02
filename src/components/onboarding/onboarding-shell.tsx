import { OnboardingHeader } from "./onboarding-header";
import { OnboardingScorePanel } from "./onboarding-score-panel";
import { OnboardingSidebar } from "./onboarding-sidebar";
import type { OnboardingStepId } from "./types";

type OnboardingShellProps = {
  activeStep: OnboardingStepId;
  children: React.ReactNode;
  /** Wider main column for branch setup / dense forms */
  contentMaxWidthClass?: string;
  saveProgressVariant?: "gradient" | "outline";
  scoreProgressPercent?: number;
  /** License step uses alternate chrome from Figma */
  variant?: "default" | "clinical";
  showScorePanel?: boolean;
};

export function OnboardingShell({
  activeStep,
  children,
  contentMaxWidthClass = "max-w-3xl",
  saveProgressVariant = "gradient",
  scoreProgressPercent = 25,
  variant = "default",
  showScorePanel = true,
}: OnboardingShellProps) {
  return (
    <div className="aura-landing min-h-dvh bg-[var(--app-canvas)] text-[var(--app-text)]">
      <OnboardingHeader variant={variant === "clinical" ? "clinical" : "default"} />
      <div className="mx-auto flex max-w-[1600px] flex-col pt-16 lg:flex-row">
        <OnboardingSidebar
          activeStep={activeStep}
          saveProgressVariant={saveProgressVariant}
          variant={variant === "clinical" ? "clinical" : "default"}
        />
        <div className="flex min-h-[calc(100dvh-4rem)] flex-1 flex-col lg:flex-row">
          <div className="flex flex-1 justify-center overflow-auto px-6 py-10 lg:px-10 lg:py-10">
            <div className={`w-full ${contentMaxWidthClass}`}>{children}</div>
          </div>
          {showScorePanel ? (
            <div className="hidden shrink-0 lg:block lg:pr-8 lg:pt-12 xl:pr-12">
              <OnboardingScorePanel progressPercent={scoreProgressPercent} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
