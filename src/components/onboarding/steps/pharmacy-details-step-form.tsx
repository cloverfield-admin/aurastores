"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import type { OnboardingDraft } from "@/components/onboarding/types";
import { useAuraFeedback } from "@/components/providers/aura-feedback-provider";
import { useOnboardingProgress } from "@/components/onboarding/onboarding-progress-provider";
import { AuraInlineAlert } from "@/components/ui/aura-inline-alert";
import { useSavePharmacyDetailsMutation } from "@/lib/queries/onboarding";
import { ROUTES } from "@/lib/routes";

const BranchLocationPicker = dynamic(
  () =>
    import("@/components/onboarding/branch-location-picker").then((mod) => mod.BranchLocationPicker),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center bg-[#e2e8f0] text-sm text-[#64748b]">
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

function coordFromDraft(value: number | null | undefined): number | null {
  if (value == null || typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return value;
}

function toInputTime(value: string | null | undefined): string | null {
  if (value == null || value === "") {
    return null;
  }
  const s = String(value);
  const match = /^(\d{2}):(\d{2})/.exec(s);
  return match ? `${match[1]}:${match[2]}` : null;
}

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
  hours: NonNullable<OnboardingDraft["mainBranch"]>["operatingHours"] | undefined | null,
): WeeklyRowState[] {
  if (!hours || hours.length !== 7) {
    return defaultWeeklyRows();
  }
  const byDay = new Map(hours.map((h) => [h.dayOfWeek, h]));
  return WEEK_DISPLAY_ORDER.map(({ dayOfWeek, label }) => {
    const row = byDay.get(dayOfWeek);
    if (!row) {
      return {
        dayOfWeek,
        label,
        isClosed: dayOfWeek === 0,
        ...defaultOpenHoursForDay(dayOfWeek),
      };
    }
    if (row.isClosed) {
      return {
        dayOfWeek,
        label,
        isClosed: true,
        opensAt: "08:00",
        closesAt: "20:00",
      };
    }
    const opens = toInputTime(row.opensAt ?? undefined) ?? "08:00";
    const closes = toInputTime(row.closesAt ?? undefined) ?? "20:00";
    return {
      dayOfWeek,
      label,
      isClosed: false,
      opensAt: opens,
      closesAt: closes,
    };
  });
}

function operatingHoursSignature(
  hours: NonNullable<OnboardingDraft["mainBranch"]>["operatingHours"] | undefined,
): string {
  if (!hours?.length) {
    return "";
  }
  return [...hours]
    .map((h) => `${h.dayOfWeek}:${h.isClosed ? "c" : `${h.opensAt ?? ""}-${h.closesAt ?? ""}`}`)
    .sort()
    .join("|");
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

export function PharmacyDetailsStepForm() {
  const { draft, loading } = useOnboardingProgress();

  if (loading && !draft) {
    return <div className="py-12 text-sm text-[#64748b]">Loading onboarding details...</div>;
  }

  if (!draft) {
    return (
      <div className="py-12">
        <AuraInlineAlert
          variant="error"
          title="Branch setup unavailable"
          description="We couldn’t load your branch details right now. Refresh and try again."
        />
      </div>
    );
  }

  const branch = draft.mainBranch;
  const draftKey = [
    branch?.branchName ?? "",
    String(branch?.pharmacistCount ?? 1),
    branch?.branchLocation ?? "",
    String(branch?.latitude ?? ""),
    String(branch?.longitude ?? ""),
    branch?.hoursMode ?? "custom",
    operatingHoursSignature(branch?.operatingHours),
  ].join("|");

  return <PharmacyDetailsStepFormFields key={draftKey} draft={draft} />;
}

function PharmacyDetailsStepFormFields({
  draft,
}: {
  draft: NonNullable<ReturnType<typeof useOnboardingProgress>["draft"]>;
}) {
  const router = useRouter();
  const { notify, withLoading, isLoading } = useAuraFeedback();
  const savePharmacyDetailsMutation = useSavePharmacyDetailsMutation();
  const [hoursMode, setHoursMode] = useState<HoursMode>(draft.mainBranch?.hoursMode ?? "custom");
  const [branchName, setBranchName] = useState(draft.mainBranch?.branchName ?? "");
  const [pharmacistCount, setPharmacistCount] = useState(
    String(draft.mainBranch?.pharmacistCount ?? 1),
  );
  const [branchLocation, setBranchLocation] = useState(draft.mainBranch?.branchLocation ?? "");
  const [mapLat, setMapLat] = useState<number | null>(() =>
    coordFromDraft(draft.mainBranch?.latitude),
  );
  const [mapLng, setMapLng] = useState<number | null>(() =>
    coordFromDraft(draft.mainBranch?.longitude),
  );
  const [weeklyHours, setWeeklyHours] = useState<WeeklyRowState[]>(() =>
    weeklyRowsFromOperatingHours(draft.mainBranch?.operatingHours),
  );
  const [error, setError] = useState<string | null>(null);
  const [mapExpanded, setMapExpanded] = useState(false);
  const isBusy = isLoading("onboarding-pharmacy-details");

  useEffect(() => {
    const id = window.setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 320);
    return () => window.clearTimeout(id);
  }, [mapExpanded]);

  const trimmedLocation = branchLocation.trim();
  const mapsExternalHref =
    mapLat != null && mapLng != null
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${mapLat},${mapLng}`)}`
      : trimmedLocation.length >= 3
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmedLocation)}`
        : "";
  const showExternalMapLink = mapsExternalHref.length > 0;

  function updateDay(dayOfWeek: number, patch: Partial<Pick<WeeklyRowState, "isClosed" | "opensAt" | "closesAt">>) {
    setWeeklyHours((prev) =>
      prev.map((row) => (row.dayOfWeek === dayOfWeek ? { ...row, ...patch } : row)),
    );
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    try {
      await withLoading("onboarding-pharmacy-details", "Saving your main branch details...", () =>
        savePharmacyDetailsMutation.mutateAsync({
          branchName,
          pharmacistCount,
          branchLocation,
          hoursMode,
          latitude: mapLat,
          longitude: mapLng,
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
      notify({
        variant: "success",
        title: "Branch details saved",
        description: "Your main branch has been configured. Continue with compliance uploads.",
      });
      router.push(ROUTES.dashboard.onboarding.license);
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Could not save branch details.";
      setError(message);
      notify({
        variant: "error",
        title: "Branch setup failed",
        description: message,
      });
    }
  }

  return (
    <form
      className={`flex flex-col gap-10 pb-8 transition ${isBusy ? "opacity-75" : ""}`}
      onSubmit={handleSubmit}
      aria-busy={isBusy}
    >
      <fieldset disabled={isBusy} className="contents">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#e1e0ff] px-3 py-1">
            <span className="size-1.5 shrink-0 rounded-full bg-[#6063ee]" aria-hidden />
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#2f2ebe]">
              Branch Initialization
            </span>
          </div>
          <h1 className="font-[family-name:var(--font-manrope)] text-4xl font-extrabold tracking-tight text-[#191c1e] sm:text-5xl sm:leading-[48px] sm:tracking-[-0.025em]">
            Setting up your <span className="text-[#006a65]">Main Branch</span>
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-[#3c4948]">
            Define the core operational hub of your pharmacy network. This branch will serve as your
            primary distribution and synchronization point.
          </p>
        </div>

        <div className="relative">
          <div
            className="pointer-events-none absolute -inset-1 rounded-[20px] bg-gradient-to-r from-[#0fb9b1] to-[#6063ee] opacity-15 blur-sm"
            aria-hidden
          />
          <div className="relative flex flex-col gap-8 rounded-[20px] border border-[rgba(15,185,177,0.1)] bg-white/90 p-8 backdrop-blur-md sm:flex-row sm:items-center">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-[rgba(15,185,177,0.1)]">
              <span className="material-symbols-outlined notranslate text-3xl text-[#006a65]">
                inventory_2
              </span>
            </div>
            <div className="min-w-0 space-y-2">
              <h2 className="font-[family-name:var(--font-manrope)] text-xl font-bold text-[#191c1e]">
                The Aura Sync Advantage
              </h2>
              <p className="text-base leading-relaxed text-[#3c4948]">
                Setting up your first branch activates{" "}
                <span className="font-semibold text-[#006a65]">Aura Sync</span>, allowing real-time
                inventory and sales tracking across your entire ecosystem. All stock levels,
                prescriptions, and financial data will be unified instantly.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6 xl:flex-row xl:items-stretch">
          <div className="flex flex-1 flex-col gap-6">
            <div className="flex flex-col gap-4 rounded-[20px] bg-[#f2f4f6] p-6">
              <div className={labelRow}>
                <span className="material-symbols-outlined notranslate text-base text-[#64748b]">
                  store
                </span>
                Branch name
              </div>
              <input
                name="branchName"
                type="text"
                placeholder="e.g. Central City Medical Hub"
                className={inputMuted}
                value={branchName}
                onChange={(event) => setBranchName(event.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-4 rounded-[20px] bg-[#f2f4f6] p-6">
              <div className={labelRow}>
                <span className="material-symbols-outlined notranslate text-base text-[#64748b]">
                  groups
                </span>
                Number of pharmacists
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <input
                  name="pharmacistCount"
                  type="number"
                  min={1}
                  value={pharmacistCount}
                  onChange={(event) => setPharmacistCount(event.target.value)}
                  className={`${inputMuted} w-24 text-center`}
                  required
                />
                <span className="text-sm text-[#3c4948]">Licensed personnel on site</span>
              </div>
            </div>
          </div>

          <div
            className={`flex flex-1 flex-col rounded-[20px] bg-[#f2f4f6] p-6 xl:min-w-0 ${
              mapExpanded ? "min-h-[min(88dvh,900px)] xl:min-h-[min(82dvh,900px)]" : "min-h-[320px] xl:min-h-0"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className={labelRow}>
                <span className="material-symbols-outlined notranslate text-base text-[#64748b]">
                  location_on
                </span>
                Branch location
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
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
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[#64748b]">
              Use the map search or click to set a pin. Enter the full street address in the field
              under the map—both save with this branch when you continue.
            </p>
            {mapLat != null && mapLng != null ? (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[#3c4948]">
                <span className="font-mono tabular-nums">
                  {mapLat.toFixed(6)}, {mapLng.toFixed(6)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setMapLat(null);
                    setMapLng(null);
                  }}
                  className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold text-[#64748b] shadow-sm ring-1 ring-black/5 hover:bg-white"
                >
                  Clear pin
                </button>
              </div>
            ) : null}
            <div
              className={`relative mt-3 flex-1 overflow-visible rounded-2xl bg-[#e2e8f0] transition-[min-height] duration-300 ease-out ${
                mapExpanded
                  ? "min-h-[min(78dvh,760px)] sm:min-h-[min(72dvh,820px)]"
                  : "min-h-[min(360px,42dvh)] sm:min-h-[min(400px,38dvh)]"
              }`}
            >
              <BranchLocationPicker
                className={`absolute inset-0 z-0 w-full ${
                  mapExpanded
                    ? "min-h-[min(78dvh,760px)] sm:min-h-[min(72dvh,820px)]"
                    : "min-h-[min(360px,42dvh)] sm:min-h-[min(400px,38dvh)]"
                }`}
                initialLatitude={mapLat}
                initialLongitude={mapLng}
                onPick={(lat, lng) => {
                  setMapLat(lat);
                  setMapLng(lng);
                }}
                onResolvedAddress={(formatted) => setBranchLocation(formatted)}
              />
            </div>
            {/* <div className="mt-4 flex flex-col gap-2">
              <label className={labelRow} htmlFor="branchLocation">
                <span className="material-symbols-outlined notranslate text-base text-[#64748b]">
                  signpost
                </span>
                Physical address
              </label>
              <input
                id="branchLocation"
                name="branchLocation"
                type="text"
                placeholder="Street, city, state, ZIP…"
                className={inputMuted}
                value={branchLocation}
                onChange={(event) => setBranchLocation(event.target.value)}
                required
              />
            </div> */}
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
              <p className="text-sm text-[#3c4948]">
                When will this branch be active for Aura Sync?
              </p>
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
              Branch marked as open 24 hours, every day. You can switch to custom hours anytime.
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
                        <label className="sr-only" htmlFor={`open-${row.dayOfWeek}`}>
                          {row.label} opens
                        </label>
                        <input
                          id={`open-${row.dayOfWeek}`}
                          type="time"
                          value={row.opensAt}
                          onChange={(event) => updateDay(row.dayOfWeek, { opensAt: event.target.value })}
                          className={timeInputClass(row)}
                        />
                        <label className="sr-only" htmlFor={`close-${row.dayOfWeek}`}>
                          {row.label} closes
                        </label>
                        <input
                          id={`close-${row.dayOfWeek}`}
                          type="time"
                          value={row.closesAt}
                          onChange={(event) => updateDay(row.dayOfWeek, { closesAt: event.target.value })}
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

        {error ? (
          <AuraInlineAlert
            variant="error"
            title="Could not save branch details"
            description={error}
          />
        ) : null}

        <div className="flex flex-col-reverse items-stretch justify-between gap-4 border-t border-[rgba(187,201,199,0.2)] pt-10 sm:flex-row sm:items-center">
          <Link
            href={ROUTES.dashboard.onboarding.root}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-[#f2f4f6] px-8 py-3 text-base font-semibold text-[#3c4948] transition hover:bg-[#e8eaed] ${isBusy ? "pointer-events-none opacity-60" : ""}`}
          >
            <span className="material-symbols-outlined notranslate text-lg">arrow_back</span>
            Back
          </Link>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-3 rounded-2xl bg-[#006a65] px-10 py-4 text-base font-semibold text-white shadow-[0_10px_15px_-3px_rgba(0,106,101,0.2),0_4px_6px_-4px_rgba(0,106,101,0.2)] transition hover:bg-[#005850] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savePharmacyDetailsMutation.isPending ? "Saving..." : "Next: License Upload"}
            <span className="material-symbols-outlined notranslate text-base">arrow_forward</span>
          </button>
        </div>
      </fieldset>
    </form>
  );
}
