"use client";

/**
 * Shared KPI/dashboard primitives. Extracted verbatim from
 * `aura-insights-content.tsx` so the platform admin console renders the same cards
 * as the tenant dashboards rather than growing a second, drifting set.
 */

export function KpiCard({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: string;
  label: string;
  value: string;
  sub: string;
  /** `warn` marks a number that wants attention (MRR at risk, disabled accounts). */
  tone?: "default" | "warn";
}) {
  const warn = tone === "warn";
  return (
    <article className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div
          className={`flex size-10 items-center justify-center rounded-xl ${
            warn ? "bg-[#fdf3f3]" : "bg-[var(--app-surface-subtle)]"
          }`}
        >
          <span
            className={`material-symbols-outlined notranslate text-2xl ${
              warn ? "text-[#7d2a2a]" : "text-[var(--app-text-muted)]"
            }`}
          >
            {icon}
          </span>
        </div>
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--app-text-secondary)]">
        {label}
      </p>
      <p
        className={`mt-1 font-[family-name:var(--font-manrope)] text-2xl font-extrabold ${
          warn ? "text-[#7d2a2a]" : "text-[var(--app-text)]"
        }`}
      >
        {value}
      </p>
      <p className="mt-2 text-[11px] text-[var(--app-text-faint)]">{sub}</p>
    </article>
  );
}

export function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
        active
          ? "bg-[rgba(15,185,177,0.14)] text-[var(--app-link-teal)]"
          : "bg-[var(--app-surface-subtle)] text-[var(--app-text-muted)] hover:bg-[var(--app-input-focus-bg)]"
      }`}
    >
      {children}
    </button>
  );
}

export function SkeletonCard() {
  return (
    <div className="h-[124px] rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-surface-muted)]" />
  );
}

/** A labelled horizontal bar, used for plan mix / status mix / funnel stages. */
export function BarRow({
  label,
  value,
  max,
  hint,
}: {
  label: string;
  value: number;
  /** The scale's maximum. A zero max renders an empty bar rather than dividing by zero. */
  max: number;
  hint?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-semibold text-[var(--app-text)]">{label}</span>
        <span className="text-[var(--app-text-muted)]">
          {value.toLocaleString()}
          {hint ? <span className="ml-2 text-[11px] text-[var(--app-text-faint)]">{hint}</span> : null}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--app-surface-subtle)]">
        <div
          className="h-full rounded-full bg-[var(--app-brand)] transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
