"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AuraInlineAlert } from "@/components/ui/aura-inline-alert";
import { useAuraFeedback } from "@/components/providers/aura-feedback-provider";
import { useBranchDetailQuery, useUpdateBranchMutation } from "@/lib/queries/branches";
import { ROUTES } from "@/lib/routes";
import type { UpdateOrganizationBranchInput } from "@/lib/validation/branches";

const BranchLocationPicker = dynamic(
  () =>
    import("@/components/onboarding/branch-location-picker").then((mod) => mod.BranchLocationPicker),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center bg-[#e2e8f0] text-sm text-[var(--app-text-muted)]">
        Loading map…
      </div>
    ),
  },
);

const inputMuted =
  "w-full rounded-2xl border border-transparent bg-[#e0e3e5] px-3 py-3.5 text-base text-[#191c1e] outline-none placeholder:text-[#bbc9c7] focus:border-[#006a65]/25 focus:ring-2 focus:ring-[#006a65]/15";

const labelRow = "flex items-center gap-2 text-sm font-semibold text-[#3c4948]";

type HoursMode = "24-7" | "custom";

const WEEK_DISPLAY_ORDER = [
  { dayOfWeek: 1, label: "Mon" },
  { dayOfWeek: 2, label: "Tue" },
  { dayOfWeek: 3, label: "Wed" },
  { dayOfWeek: 4, label: "Thu" },
  { dayOfWeek: 5, label: "Fri" },
  { dayOfWeek: 6, label: "Sat" },
  { dayOfWeek: 0, label: "Sun" },
] as const;

type WeeklyRowState = {
  dayOfWeek: number;
  label: string;
  isClosed: boolean;
  opensAt: string;
  closesAt: string;
};

function defaultOpenHoursForDay(dayOfWeek: number): { opensAt: string; closesAt: string } {
  if (dayOfWeek === 6) {
    return { opensAt: "09:00", closesAt: "15:00" };
  }
  return { opensAt: "08:00", closesAt: "20:00" };
}

function defaultWeeklyRows(): WeeklyRowState[] {
  return WEEK_DISPLAY_ORDER.map(({ dayOfWeek, label }) => {
    if (dayOfWeek === 0) {
      return {
        dayOfWeek,
        label,
        isClosed: true,
        opensAt: "08:00",
        closesAt: "20:00",
      };
    }
    return {
      dayOfWeek,
      label,
      isClosed: false,
      ...defaultOpenHoursForDay(dayOfWeek),
    };
  });
}

function weeklyRowsFromOperatingHours(
  hours:
    | Array<{ dayOfWeek: number; isClosed: boolean; opensAt: string | null; closesAt: string | null }>
    | undefined,
): WeeklyRowState[] {
  if (!hours || hours.length !== 7) {
    return defaultWeeklyRows();
  }
  const byDay = new Map(hours.map((h) => [h.dayOfWeek, h]));
  return WEEK_DISPLAY_ORDER.map(({ dayOfWeek, label }) => {
    const row = byDay.get(dayOfWeek);
    if (!row) {
      return { dayOfWeek, label, isClosed: dayOfWeek === 0, ...defaultOpenHoursForDay(dayOfWeek) };
    }
    if (row.isClosed) {
      return { dayOfWeek, label, isClosed: true, opensAt: "08:00", closesAt: "20:00" };
    }
    return {
      dayOfWeek,
      label,
      isClosed: false,
      opensAt: row.opensAt ?? "08:00",
      closesAt: row.closesAt ?? "20:00",
    };
  });
}

function cardShellClass(row: WeeklyRowState): string {
  const base =
    "flex min-w-0 w-full flex-col gap-2 rounded-2xl p-4 text-center [overflow-wrap:anywhere]";
  if (row.isClosed) {
    return `${base} bg-[#e0e3e5] pb-6 pt-4 opacity-60`;
  }
  if (row.dayOfWeek >= 1 && row.dayOfWeek <= 5) {
    return `${base} bg-[#0fb9b1]`;
  }
  return `${base} bg-[#e0e3e5]`;
}

function labelClassForRow(row: WeeklyRowState): string {
  if (row.isClosed) {
    return "text-[10px] font-semibold uppercase tracking-tight text-[#6c7a78]";
  }
  if (row.dayOfWeek >= 1 && row.dayOfWeek <= 5) {
    return "text-[10px] font-semibold uppercase tracking-tight text-[#004340]/80";
  }
  return "text-[10px] font-semibold uppercase tracking-tight text-[#6c7a78]";
}

function timeInputClass(row: WeeklyRowState): string {
  const base =
    "box-border min-h-10 w-full max-w-full rounded-xl border px-1.5 py-2 text-center text-sm font-semibold outline-none focus:ring-2";
  if (row.isClosed) {
    return `${base} border-[#94a3b8]/30 bg-white/60 text-[#3c4948] focus:ring-[#64748b]/20`;
  }
  if (row.dayOfWeek >= 1 && row.dayOfWeek <= 5) {
    return `${base} border-[#004340]/25 bg-white/90 text-[#004340] focus:ring-[#004340]/25`;
  }
  return `${base} border-[#6c7a78]/30 bg-white text-[#3c4948] focus:ring-[#64748b]/20`;
}

export function BranchEditContent({ branchId }: { branchId: string }) {
  const router = useRouter();
  const { notify, withLoading, isLoading } = useAuraFeedback();
  const detailQuery = useBranchDetailQuery(branchId);
  const updateMutation = useUpdateBranchMutation(branchId);
  const branch = detailQuery.data?.branch;

  const [error, setError] = useState<string | null>(null);
  const [mapExpanded, setMapExpanded] = useState(false);
  const isBusy = isLoading("dashboard-edit-branch");

  const initialWeekly = useMemo(
    () => weeklyRowsFromOperatingHours(branch?.operatingHours),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [branch?.id],
  );

  const [name, setName] = useState("");
  const [type, setType] = useState<UpdateOrganizationBranchInput["type"]>("retail");
  const [status, setStatus] = useState<UpdateOrganizationBranchInput["status"]>("draft");
  const [professionalStaffCount, setProfessionalStaffCount] = useState("1");
  const [addressLine1, setAddressLine1] = useState("");
  const [mapLat, setMapLat] = useState<number | null>(null);
  const [mapLng, setMapLng] = useState<number | null>(null);
  const [hoursMode, setHoursMode] = useState<HoursMode>("custom");
  const [weeklyHours, setWeeklyHours] = useState<WeeklyRowState[]>(() => defaultWeeklyRows());

  useEffect(() => {
    if (!branch) return;
    setName(branch.name);
    setType(branch.type);
    setStatus(branch.status);
    setProfessionalStaffCount(String(branch.professionalStaffCount));
    setAddressLine1(branch.addressLine1);
    setMapLat(branch.latitude);
    setMapLng(branch.longitude);
    setWeeklyHours(initialWeekly);
    setHoursMode("custom");
  }, [branch, initialWeekly]);

  useEffect(() => {
    const id = window.setTimeout(() => window.dispatchEvent(new Event("resize")), 320);
    return () => window.clearTimeout(id);
  }, [mapExpanded]);

  function updateDay(
    dayOfWeek: number,
    patch: Partial<Pick<WeeklyRowState, "isClosed" | "opensAt" | "closesAt">>,
  ) {
    setWeeklyHours((prev) =>
      prev.map((row) => (row.dayOfWeek === dayOfWeek ? { ...row, ...patch } : row)),
    );
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    try {
      const count = Number.parseInt(professionalStaffCount, 10);
      await withLoading("dashboard-edit-branch", "Saving branch changes...", () =>
        updateMutation.mutateAsync({
          name,
          type,
          status,
          professionalStaffCount: Number.isFinite(count) ? count : 1,
          addressLine1,
          latitude: mapLat,
          longitude: mapLng,
          hoursMode,
          ...(hoursMode === "custom"
            ? {
                weeklyHours: weeklyHours.map((r) => ({
                  dayOfWeek: r.dayOfWeek,
                  isClosed: r.isClosed,
                  opensAt: r.isClosed ? null : r.opensAt,
                  closesAt: r.isClosed ? null : r.closesAt,
                })),
              }
            : {}),
        }),
      );
      notify({ variant: "success", title: "Saved", description: "Branch updated successfully." });
      router.push(`${ROUTES.dashboard.organization}/branches/${encodeURIComponent(branchId)}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save branch.";
      setError(message);
      notify({ variant: "error", title: "Save failed", description: message });
    }
  }

  if (detailQuery.isPending) {
    return <div className="px-4 py-10 text-sm text-[var(--app-text-muted)]">Loading branch…</div>;
  }
  if (detailQuery.isError) {
    return (
      <div className="px-4 py-10 text-sm text-red-600">
        Could not load branch. {detailQuery.error instanceof Error ? detailQuery.error.message : ""}
      </div>
    );
  }
  if (!branch) {
    return <div className="px-4 py-10 text-sm text-[var(--app-text-muted)]">Branch not found.</div>;
  }

  return (
    <div className="px-4 pb-16 pt-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1280px]">
        <form className="flex flex-col gap-10 pb-8" onSubmit={handleSubmit} aria-busy={isBusy}>
          <fieldset disabled={isBusy} className="contents">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-2">
                <h1 className="font-[family-name:var(--font-manrope)] text-3xl font-extrabold tracking-tight text-[#191c1e] sm:text-4xl">
                  Edit Branch
                </h1>
                <p className="text-sm text-[var(--app-text-muted)]">
                  {branch.name} · <span className="font-mono">{branch.code}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={`${ROUTES.dashboard.organization}/branches/${encodeURIComponent(branchId)}`}
                  className="rounded-xl bg-[var(--app-input-bg)] px-4 py-2 text-sm font-semibold text-[var(--app-text)]"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="rounded-xl bg-gradient-to-br from-[#0fb9b1] to-[#6366f1] px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
                >
                  {updateMutation.isPending ? "Saving…" : "Save"}
                </button>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-4 rounded-[20px] bg-[#f2f4f6] p-6">
                  <div className={labelRow}>
                    <span className="material-symbols-outlined notranslate text-base text-[var(--app-text-muted)]">
                      store
                    </span>
                    Branch name
                  </div>
                  <input className={inputMuted} value={name} onChange={(e) => setName(e.target.value)} required />
                </div>

                <div className="grid gap-4 rounded-[20px] bg-[#f2f4f6] p-6 sm:grid-cols-2">
                  <label className="flex flex-col gap-2">
                    <span className={labelRow}>
                      <span className="material-symbols-outlined notranslate text-base text-[var(--app-text-muted)]">
                        storefront
                      </span>
                      Type
                    </span>
                    <select className={inputMuted} value={type} onChange={(e) => setType(e.target.value as any)}>
                      <option value="retail">Retail</option>
                      <option value="warehouse">Warehouse</option>
                      <option value="main">Main</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className={labelRow}>
                      <span className="material-symbols-outlined notranslate text-base text-[var(--app-text-muted)]">
                        flag
                      </span>
                      Status
                    </span>
                    <select className={inputMuted} value={status} onChange={(e) => setStatus(e.target.value as any)}>
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="syncing">Syncing</option>
                    </select>
                  </label>
                </div>

                <div className="flex flex-col gap-4 rounded-[20px] bg-[#f2f4f6] p-6">
                  <div className={labelRow}>
                    <span className="material-symbols-outlined notranslate text-base text-[var(--app-text-muted)]">
                      groups
                    </span>
                    On-site professional staff
                  </div>
                  <input
                    className={`${inputMuted} w-32 text-center`}
                    type="number"
                    min={1}
                    value={professionalStaffCount}
                    onChange={(e) => setProfessionalStaffCount(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div
                className={`flex flex-col rounded-[20px] bg-[#f2f4f6] p-6 ${
                  mapExpanded ? "min-h-[min(88dvh,900px)]" : "min-h-[360px]"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className={labelRow}>
                    <span className="material-symbols-outlined notranslate text-base text-[var(--app-text-muted)]">
                      location_on
                    </span>
                    Location
                  </div>
                  <button
                    type="button"
                    onClick={() => setMapExpanded((v) => !v)}
                    className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-[#006a65] shadow-sm ring-1 ring-black/5 transition hover:bg-white"
                  >
                    <span className="material-symbols-outlined notranslate text-base">
                      {mapExpanded ? "close_fullscreen" : "open_in_full"}
                    </span>
                    {mapExpanded ? "Smaller map" : "Larger map"}
                  </button>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  <label className={labelRow} htmlFor="addressLine1">
                    <span className="material-symbols-outlined notranslate text-base text-[var(--app-text-muted)]">
                      signpost
                    </span>
                    Address
                  </label>
                  <input
                    id="addressLine1"
                    className={inputMuted}
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    required
                  />
                </div>
                <div className="relative mt-4 flex-1 overflow-hidden rounded-2xl bg-[#e2e8f0]">
                  <BranchLocationPicker
                    className="absolute inset-0"
                    initialLatitude={mapLat}
                    initialLongitude={mapLng}
                    onPick={(lat, lng) => {
                      setMapLat(lat);
                      setMapLng(lng);
                    }}
                    onResolvedAddress={(formatted) => setAddressLine1(formatted)}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-8 rounded-[20px] bg-[#f2f4f6] p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined notranslate text-[#191c1e]">schedule</span>
                    <h2 className="font-[family-name:var(--font-manrope)] text-lg font-bold text-[#191c1e]">
                      Operating Hours
                    </h2>
                  </div>
                  <p className="text-sm text-[#3c4948]">Update when this branch is open.</p>
                </div>
                <div className="flex shrink-0 gap-3">
                  <button
                    type="button"
                    onClick={() => setHoursMode("24-7")}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                      hoursMode === "24-7"
                        ? "border border-[rgba(187,201,199,0.4)] bg-white text-[#191c1e] shadow-sm"
                        : "bg-[#e0e3e5] text-[#191c1e]"
                    }`}
                  >
                    24/7 MODE
                  </button>
                  <button
                    type="button"
                    onClick={() => setHoursMode("custom")}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                      hoursMode === "custom"
                        ? "border border-[rgba(187,201,199,0.4)] bg-white text-[#191c1e] shadow-sm"
                        : "bg-[#e0e3e5] text-[#191c1e]"
                    }`}
                  >
                    CUSTOM
                  </button>
                </div>
              </div>

              {hoursMode === "24-7" ? (
                <p className="rounded-2xl border border-[rgba(15,185,177,0.2)] bg-white/80 px-4 py-6 text-center text-sm font-medium text-[#006a65]">
                  Branch marked as open 24 hours, every day.
                </p>
              ) : (
                <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(12rem,100%),1fr))]">
                  {weeklyHours.map((row) => (
                    <div key={row.dayOfWeek} className={cardShellClass(row)}>
                      <span className={labelClassForRow(row)}>{row.label}</span>
                      {row.isClosed ? (
                        <>
                          <span className="text-sm font-semibold text-[#3c4948]">CLOSED</span>
                          <button
                            type="button"
                            onClick={() =>
                              updateDay(row.dayOfWeek, {
                                isClosed: false,
                                ...defaultOpenHoursForDay(row.dayOfWeek),
                              })
                            }
                            className="mt-1 rounded-full bg-white/80 px-2 py-1 text-[10px] font-semibold text-[#006a65] shadow-sm"
                          >
                            Add hours
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="flex flex-col gap-1.5">
                            <input
                              type="time"
                              value={row.opensAt}
                              onChange={(e) => updateDay(row.dayOfWeek, { opensAt: e.target.value })}
                              className={timeInputClass(row)}
                            />
                            <input
                              type="time"
                              value={row.closesAt}
                              onChange={(e) => updateDay(row.dayOfWeek, { closesAt: e.target.value })}
                              className={timeInputClass(row)}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => updateDay(row.dayOfWeek, { isClosed: true })}
                            className="mt-1 rounded-full bg-black/5 px-2 py-1 text-[10px] font-semibold text-[#3c4948]"
                          >
                            Mark closed
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error ? <AuraInlineAlert variant="error" title="Could not save" description={error} /> : null}
          </fieldset>
        </form>
      </div>
    </div>
  );
}

