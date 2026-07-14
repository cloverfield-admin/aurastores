/** Shared formatting for the platform console. */

/** ZMW, whole kwacha. Cents precision is noise at platform scale. */
export function money(cents: number): string {
  return `ZMW ${Math.round(cents / 100).toLocaleString()}`;
}

/** Compact money for KPI tiles: ZMW 1.2M / ZMW 45.0K / ZMW 900. */
export function moneyCompact(cents: number): string {
  const kwacha = cents / 100;
  if (Math.abs(kwacha) >= 1_000_000) return `ZMW ${(kwacha / 1_000_000).toFixed(1)}M`;
  if (Math.abs(kwacha) >= 1_000) return `ZMW ${(kwacha / 1_000).toFixed(1)}K`;
  return `ZMW ${Math.round(kwacha).toLocaleString()}`;
}

export function count(n: number): string {
  return n.toLocaleString();
}

export function percent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

export function date(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function dateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "3 days ago" / "in 12 days" / "—". */
export function relative(iso: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  const days = Math.round((then - Date.now()) / 86_400_000);
  if (days === 0) return "today";
  if (days > 0) return `in ${days} day${days === 1 ? "" : "s"}`;
  const ago = Math.abs(days);
  return `${ago} day${ago === 1 ? "" : "s"} ago`;
}

/** Turns "YYYY-MM-DD" into a short axis label. */
export function dayLabel(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
}

const STATUS_TONES: Record<string, string> = {
  active: "bg-[rgba(15,185,177,0.14)] text-[var(--app-link-teal)]",
  trial: "bg-[#eef2ff] text-[#4338ca]",
  trialing: "bg-[#eef2ff] text-[#4338ca]",
  suspended: "bg-[#fdf3f3] text-[#7d2a2a]",
  archived: "bg-[var(--app-surface-subtle)] text-[var(--app-text-muted)]",
  past_due: "bg-[#fdf6e3] text-[#7a5b16]",
  pending_payment: "bg-[#fdf6e3] text-[#7a5b16]",
  canceled: "bg-[var(--app-surface-subtle)] text-[var(--app-text-muted)]",
  disabled: "bg-[#fdf3f3] text-[#7d2a2a]",
  removed: "bg-[#fdf3f3] text-[#7d2a2a]",
  invited: "bg-[#eef2ff] text-[#4338ca]",
};

export function statusClass(status: string): string {
  return STATUS_TONES[status] ?? "bg-[var(--app-surface-subtle)] text-[var(--app-text-muted)]";
}

export function humanize(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
