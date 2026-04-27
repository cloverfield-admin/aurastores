"use client";

type AuraInlineAlertProps = {
  title?: string;
  description: string;
  variant?: "error" | "success" | "info" | "warning";
  className?: string;
};

export function AuraInlineAlert({
  title,
  description,
  variant = "info",
  className = "",
}: AuraInlineAlertProps) {
  const tone = {
    error: {
      wrapper:
        "border-[rgba(239,68,68,0.18)] bg-[rgba(254,242,242,0.92)] dark:border-red-500/25 dark:bg-red-950/40",
      badge: "bg-[rgba(239,68,68,0.14)] text-[#ba1a1a] dark:bg-red-500/15 dark:text-red-200",
      title: "text-[#7f1d1d] dark:text-red-100",
      body: "text-[#991b1b] dark:text-red-200/90",
      icon: "error",
    },
    success: {
      wrapper:
        "border-[var(--aura-tint-border)] bg-[var(--aura-panel-tint)]",
      badge: "aura-badge",
      title: "text-[var(--aura-tint-text-strong)]",
      body: "text-[var(--aura-tint-muted)]",
      icon: "check_circle",
    },
    warning: {
      wrapper:
        "border-[rgba(245,158,11,0.18)] bg-[rgba(255,251,235,0.96)] dark:border-amber-500/25 dark:bg-amber-950/35",
      badge: "bg-[rgba(245,158,11,0.16)] text-[#b45309] dark:bg-amber-500/15 dark:text-amber-200",
      title: "text-[#92400e] dark:text-amber-100",
      body: "text-[#b45309] dark:text-amber-200/90",
      icon: "warning",
    },
    info: {
      wrapper:
        "border-[rgba(99,102,241,0.18)] bg-[rgba(238,242,255,0.94)] dark:border-indigo-500/25 dark:bg-indigo-950/35",
      badge: "bg-[var(--aura-info-bg)] text-[var(--aura-info-text)]",
      title: "text-[var(--aura-tint-text-strong)]",
      body: "text-[var(--aura-tint-muted)]",
      icon: "info",
    },
  }[variant];

  return (
    <div className={`flex items-start gap-3 rounded-2xl border p-4 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.35)] ${tone.wrapper} ${className}`}>
      <div className={`flex size-9 shrink-0 items-center justify-center rounded-full ${tone.badge}`}>
        <span className="material-symbols-outlined notranslate text-[18px]">{tone.icon}</span>
      </div>
      <div className="min-w-0">
        {title ? <p className={`text-sm font-semibold ${tone.title}`}>{title}</p> : null}
        <p className={`text-sm leading-relaxed ${tone.body}`}>{description}</p>
      </div>
    </div>
  );
}
