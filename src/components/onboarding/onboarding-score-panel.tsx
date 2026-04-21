type OnboardingScorePanelProps = {
  progressPercent?: number;
};

export function OnboardingScorePanel({ progressPercent = 25 }: OnboardingScorePanelProps) {
  const pct = Math.min(100, Math.max(0, progressPercent));

  return (
    <aside className="w-full max-w-[216px] shrink-0">
      <div className="sticky top-24 rounded-[32px] border border-[rgba(187,201,199,0.1)] bg-[var(--app-surface)]/80 p-8 shadow-[0_20px_25px_-5px_rgba(19,78,74,0.05),0_8px_10px_-6px_rgba(19,78,74,0.05)] backdrop-blur-md">
        <div
          className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0fb9b1] to-[#6063ee]"
          aria-hidden
        >
          <span className="material-symbols-outlined notranslate text-xl text-white">
            speed
          </span>
        </div>
        <h3 className="mt-6 font-[family-name:var(--font-manrope)] text-xl font-bold leading-7 text-[var(--app-text)]">
          Onboarding
          <br />
          Score
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-[var(--app-text-secondary)]">
          You are moving 40% faster than the average pharmacy setup.
        </p>
        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.1em] text-[var(--app-text-muted)]">
            <span>Progress</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--app-border-ui)]">
            <div
              className="h-full rounded-full bg-[var(--app-brand)] transition-[width]"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <div className="mt-8 space-y-4 border-t border-[rgba(187,201,199,0.15)] pt-8">
          <div className="flex items-center gap-3">
            <span className="size-2 shrink-0 rounded-full bg-[var(--app-brand)]" />
            <span className="text-xs font-medium text-[var(--app-text)]">
              Business Validation
            </span>
          </div>
          <div className="flex items-center gap-3 opacity-40">
            <span className="size-2 shrink-0 rounded-full bg-[var(--app-text-faint)]" />
            <span className="text-xs font-medium text-[var(--app-text)]">
              Compliance Mapping
            </span>
          </div>
          <div className="flex items-center gap-3 opacity-40">
            <span className="size-2 shrink-0 rounded-full bg-[var(--app-text-faint)]" />
            <span className="text-xs font-medium text-[var(--app-text)]">
              Clinical Network Entry
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
