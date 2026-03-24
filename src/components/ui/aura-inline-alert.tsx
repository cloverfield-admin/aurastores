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
      wrapper: "border-[rgba(239,68,68,0.18)] bg-[rgba(254,242,242,0.92)]",
      badge: "bg-[rgba(239,68,68,0.14)] text-[#ba1a1a]",
      title: "text-[#7f1d1d]",
      body: "text-[#991b1b]",
      icon: "error",
    },
    success: {
      wrapper: "border-[rgba(15,185,177,0.18)] bg-[rgba(240,253,250,0.96)]",
      badge: "bg-[rgba(15,185,177,0.16)] text-[#006a65]",
      title: "text-[#065f5b]",
      body: "text-[#0f766e]",
      icon: "check_circle",
    },
    warning: {
      wrapper: "border-[rgba(245,158,11,0.18)] bg-[rgba(255,251,235,0.96)]",
      badge: "bg-[rgba(245,158,11,0.16)] text-[#b45309]",
      title: "text-[#92400e]",
      body: "text-[#b45309]",
      icon: "warning",
    },
    info: {
      wrapper: "border-[rgba(96,99,238,0.16)] bg-[rgba(245,243,255,0.94)]",
      badge: "bg-[rgba(96,99,238,0.16)] text-[#4648d4]",
      title: "text-[#3730a3]",
      body: "text-[#4c51bf]",
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
