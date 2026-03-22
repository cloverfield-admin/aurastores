"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAuraFeedback } from "@/components/providers/aura-feedback-provider";
import { useOnboardingProgress } from "@/components/onboarding/onboarding-progress-provider";
import { AuraInlineAlert } from "@/components/ui/aura-inline-alert";
import { useSavePharmacyDetailsMutation } from "@/lib/queries/onboarding";
import { ROUTES } from "@/lib/routes";

const BRANCH_MAP =
  "https://www.figma.com/api/mcp/asset/ad3a15c7-1e8a-450e-9f09-04bf27ac3168";

const inputMuted =
  "w-full rounded-2xl border border-transparent bg-[#e0e3e5] px-3 py-3.5 text-base text-[#191c1e] outline-none placeholder:text-[#bbc9c7] focus:border-[#006a65]/25 focus:ring-2 focus:ring-[#006a65]/15";

const labelRow = "flex items-center gap-2 text-sm font-semibold text-[#3c4948]";

type HoursMode = "24-7" | "custom";

const dayCards = [
  { key: "mon", label: "Mon", tone: "teal" as const, line1: "08:00 -", line2: "20:00" },
  { key: "tue", label: "Tue", tone: "teal" as const, line1: "08:00 -", line2: "20:00" },
  { key: "wed", label: "Wed", tone: "teal" as const, line1: "08:00 -", line2: "20:00" },
  { key: "thu", label: "Thu", tone: "teal" as const, line1: "08:00 -", line2: "20:00" },
  { key: "fri", label: "Fri", tone: "teal" as const, line1: "08:00 -", line2: "20:00" },
  {
    key: "sat",
    label: "Sat",
    tone: "grey" as const,
    line1: "09:00 -",
    line2: "15:00",
  },
  { key: "sun", label: "Sun", tone: "closed" as const, line1: "CLOSED", line2: "" },
];

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
    branch?.hoursMode ?? "custom",
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
  const [error, setError] = useState<string | null>(null);
  const isBusy = isLoading("onboarding-pharmacy-details");

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
          Setting up your{" "}
          <span className="text-[#006a65]">Main Branch</span>
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-[#3c4948]">
          Define the core operational hub of your pharmacy network. This branch will serve
          as your primary distribution and synchronization point.
        </p>
      </div>

      {/* Aura Sync card */}
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
              <span className="font-semibold text-[#006a65]">Aura Sync</span>, allowing
              real-time inventory and sales tracking across your entire ecosystem. All stock
              levels, prescriptions, and financial data will be unified instantly.
            </p>
          </div>
        </div>
      </div>

      {/* Branch + map bento */}
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

        <div className="flex min-h-[280px] flex-1 flex-col rounded-[20px] bg-[#f2f4f6] p-6 xl:min-h-0 xl:min-w-0">
          <div className={labelRow}>
            <span className="material-symbols-outlined notranslate text-base text-[#64748b]">
              location_on
            </span>
            Branch location
          </div>
          <div className="relative mt-4 min-h-[192px] flex-1 overflow-hidden rounded-2xl bg-[#e2e8f0]">
            <div className="absolute inset-0">
              <Image
                src={BRANCH_MAP}
                alt=""
                fill
                className="object-cover object-center"
                sizes="(max-width: 1280px) 100vw, 480px"
                priority
              />
            </div>
            <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 rounded-2xl border border-black/5 bg-white/90 p-2.5 shadow-sm backdrop-blur-md">
              <span className="material-symbols-outlined notranslate shrink-0 text-[#94a3b8]">
                my_location
              </span>
              <input
                name="branchLocation"
                type="text"
                placeholder="Enter physical address or GPS..."
                className="min-w-0 flex-1 bg-transparent text-sm text-[#191c1e] outline-none placeholder:text-[#94a3b8]"
                value={branchLocation}
                onChange={(event) => setBranchLocation(event.target.value)}
                required
              />
            </div>
          </div>
        </div>
      </div>

      {/* Operating hours */}
      <div className="flex flex-col gap-8 rounded-[20px] bg-[#f2f4f6] p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined notranslate text-[#191c1e]">
                schedule
              </span>
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {dayCards.map((d) => {
              if (d.tone === "teal") {
                return (
                  <div
                    key={d.key}
                    className="flex flex-col gap-2 rounded-2xl bg-[#0fb9b1] p-4 text-center"
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-tight text-[#004340]/80">
                      {d.label}
                    </span>
                    <span className="text-sm font-semibold leading-tight text-[#004340]">
                      {d.line1}
                      <br />
                      {d.line2}
                    </span>
                  </div>
                );
              }
              if (d.tone === "grey") {
                return (
                  <div
                    key={d.key}
                    className="flex flex-col gap-2 rounded-2xl bg-[#e0e3e5] p-4 text-center"
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-tight text-[#6c7a78]">
                      {d.label}
                    </span>
                    <span className="text-sm font-semibold leading-tight text-[#3c4948]">
                      {d.line1}
                      <br />
                      {d.line2}
                    </span>
                  </div>
                );
              }
              return (
                <div
                  key={d.key}
                  className="flex flex-col gap-2 rounded-2xl bg-[#e0e3e5] p-4 pb-9 pt-4 text-center opacity-50"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-tight text-[#6c7a78]">
                    {d.label}
                  </span>
                  <span className="text-sm font-semibold text-[#3c4948]">{d.line1}</span>
                </div>
              );
            })}
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
