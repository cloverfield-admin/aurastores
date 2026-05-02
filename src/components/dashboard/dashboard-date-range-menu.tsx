"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DASHBOARD_DATE_RANGE_MAX_DAYS } from "@/lib/api/parse-dashboard-date-range-query";
import type { DashboardDateRangeValue } from "@/lib/dashboard/dashboard-date-range-value";

function toIsoDateUtc(date: Date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfMonthUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonthsUtc(date: Date, months: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function endOfPreviousMonthUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 0));
}

function daysBetweenInclusiveUtc(startIso: string, endIso: string) {
  const start = new Date(`${startIso}T00:00:00.000Z`);
  const end = new Date(`${endIso}T00:00:00.000Z`);
  const diffDays = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return Math.max(1, diffDays + 1);
}

type DashboardDateRangeMenuProps = {
  range: DashboardDateRangeValue;
  onRangeChange: (next: DashboardDateRangeValue) => void;
  /** Accessible name for the popover, e.g. "Sales date filter". */
  dialogLabel: string;
};

export function DashboardDateRangeMenu({ range, onRangeChange, dialogLabel }: DashboardDateRangeMenuProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [draftStart, setDraftStart] = useState(range.start);
  const [draftEnd, setDraftEnd] = useState(range.end);

  const todayUtc = useMemo(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }, []);

  const thisMonthRange = useMemo<DashboardDateRangeValue>(() => {
    const start = startOfMonthUtc(todayUtc);
    return { start: toIsoDateUtc(start), end: toIsoDateUtc(todayUtc) };
  }, [todayUtc]);

  const lastMonthRange = useMemo<DashboardDateRangeValue>(() => {
    const firstOfThisMonth = startOfMonthUtc(todayUtc);
    const start = addMonthsUtc(firstOfThisMonth, -1);
    const end = endOfPreviousMonthUtc(firstOfThisMonth);
    return { start: toIsoDateUtc(start), end: toIsoDateUtc(end) };
  }, [todayUtc]);

  const last3MonthsRange = useMemo<DashboardDateRangeValue>(() => {
    const firstOfThisMonth = startOfMonthUtc(todayUtc);
    const start = addMonthsUtc(firstOfThisMonth, -2);
    return { start: toIsoDateUtc(start), end: toIsoDateUtc(todayUtc) };
  }, [todayUtc]);

  const selectedLabel = useMemo(() => {
    if (range.start === thisMonthRange.start && range.end === thisMonthRange.end) return "This Month";
    if (range.start === lastMonthRange.start && range.end === lastMonthRange.end) return "Last Month";
    if (range.start === last3MonthsRange.start && range.end === last3MonthsRange.end) return "Last 3 Months";
    return "Custom";
  }, [
    last3MonthsRange.end,
    last3MonthsRange.start,
    lastMonthRange.end,
    lastMonthRange.start,
    range.end,
    range.start,
    thisMonthRange.end,
    thisMonthRange.start,
  ]);

  const draftDays = useMemo(() => {
    if (!draftStart || !draftEnd || draftStart > draftEnd) return null;
    return daysBetweenInclusiveUtc(draftStart, draftEnd);
  }, [draftEnd, draftStart]);

  useEffect(() => {
    setDraftStart(range.start);
    setDraftEnd(range.end);
  }, [range.start, range.end]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent | TouchEvent) {
      const el = containerRef.current;
      const target = event.target as Node | null;
      if (!el || !target || el.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  function applyPreset(next: DashboardDateRangeValue) {
    onRangeChange(next);
    setDraftStart(next.start);
    setDraftEnd(next.end);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative w-full min-w-0 sm:w-auto">
      <button
        type="button"
        className="inline-flex w-full min-w-0 items-center justify-center gap-2 rounded-xl bg-[var(--app-input-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-input-focus-bg)] sm:w-auto sm:justify-start sm:px-5 sm:text-base"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="material-symbols-outlined notranslate shrink-0 text-lg">calendar_month</span>
        <span className="min-w-0 truncate text-left">{selectedLabel}</span>
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[90] bg-black/25 sm:hidden"
            aria-label="Close date filter"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-label={dialogLabel}
            className="fixed inset-x-0 bottom-0 z-[100] max-h-[min(88dvh,32rem)] overflow-y-auto overscroll-contain rounded-t-2xl border border-[var(--app-border-ui)] bg-[var(--app-surface)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_32px_rgba(15,23,42,0.12)] sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-auto sm:right-0 sm:top-[calc(100%+8px)] sm:mt-0 sm:max-h-[min(28rem,80vh)] sm:w-[min(22rem,calc(100vw-2rem))] sm:rounded-xl sm:p-3 sm:shadow-lg"
          >
            <div className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-[var(--app-border-ui)] sm:hidden" aria-hidden />

            <div className="space-y-2">
              <button
                type="button"
                className="w-full rounded-lg border border-[var(--app-border-ui)] bg-[var(--app-surface)] px-3 py-2.5 text-left text-sm font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-surface-muted)]"
                onClick={() => applyPreset(thisMonthRange)}
              >
                This Month (MTD)
              </button>
              <button
                type="button"
                className="w-full rounded-lg border border-[var(--app-border-ui)] bg-[var(--app-surface)] px-3 py-2.5 text-left text-sm font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-surface-muted)]"
                onClick={() => applyPreset(lastMonthRange)}
              >
                Last Month
              </button>
              <button
                type="button"
                className="w-full rounded-lg border border-[var(--app-border-ui)] bg-[var(--app-surface)] px-3 py-2.5 text-left text-sm font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-surface-muted)]"
                onClick={() => applyPreset(last3MonthsRange)}
              >
                Last 3 Months
              </button>
            </div>

            <div className="my-3 h-px bg-[var(--app-border-ui)]" />

            <div className="space-y-3">
              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-2">
                <label className="min-w-0 space-y-1">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-faint)]">
                    Start date
                  </span>
                  <input
                    type="date"
                    value={draftStart}
                    onChange={(e) => setDraftStart(e.target.value)}
                    className="box-border w-full min-w-0 max-w-full rounded-lg border border-[var(--app-border-ui)] bg-[var(--app-input-bg)] px-2 py-2.5 text-base text-[var(--app-text)] sm:px-3 sm:text-sm"
                  />
                </label>
                <label className="min-w-0 space-y-1">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-faint)]">
                    End date
                  </span>
                  <input
                    type="date"
                    value={draftEnd}
                    onChange={(e) => setDraftEnd(e.target.value)}
                    className="box-border w-full min-w-0 max-w-full rounded-lg border border-[var(--app-border-ui)] bg-[var(--app-input-bg)] px-2 py-2.5 text-base text-[var(--app-text)] sm:px-3 sm:text-sm"
                  />
                </label>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 break-all text-[11px] font-semibold text-[var(--app-text-faint)]">
                  {range.start} → {range.end}
                </div>
                <button
                  type="button"
                  className="w-full shrink-0 rounded-lg bg-gradient-to-br from-[#0fb9b1] to-[#6366f1] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition enabled:hover:opacity-95 disabled:opacity-50 sm:w-auto"
                  disabled={
                    !draftStart ||
                    !draftEnd ||
                    draftStart > draftEnd ||
                    (draftDays != null && draftDays > DASHBOARD_DATE_RANGE_MAX_DAYS)
                  }
                  onClick={() => {
                    onRangeChange({ start: draftStart, end: draftEnd });
                    setOpen(false);
                  }}
                >
                  Apply
                </button>
              </div>

              {draftDays != null && draftDays > DASHBOARD_DATE_RANGE_MAX_DAYS ? (
                <p className="text-[11px] font-medium text-[#e11d48]">
                  Please choose a range of {DASHBOARD_DATE_RANGE_MAX_DAYS} days or less.
                </p>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
