"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { useAuraFeedback } from "@/components/providers/aura-feedback-provider";
import { useOnboardingProgress } from "@/components/onboarding/onboarding-progress-provider";
import { AuraInlineAlert } from "@/components/ui/aura-inline-alert";
import { BranchLocationMapPreview } from "@/components/onboarding/branch-location-picker";
import { useCompleteOnboardingMutation } from "@/lib/queries/onboarding";
import { ROUTES } from "@/lib/routes";

const REVIEW_DAY_ORDER = [
  { dayOfWeek: 1, label: "Monday" },
  { dayOfWeek: 2, label: "Tuesday" },
  { dayOfWeek: 3, label: "Wednesday" },
  { dayOfWeek: 4, label: "Thursday" },
  { dayOfWeek: 5, label: "Friday" },
  { dayOfWeek: 6, label: "Saturday" },
  { dayOfWeek: 0, label: "Sunday" },
] as const;

function formatReviewTime(value: string | null | undefined): string {
  if (value == null || value === "") {
    return "";
  }
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value));
  if (!match) {
    return String(value);
  }
  let h = Number.parseInt(match[1], 10);
  const m = match[2];
  const am = h < 12 || h === 24;
  if (h === 0) {
    h = 12;
  } else if (h > 12) {
    h -= 12;
  }
  return `${h}:${m} ${am ? "AM" : "PM"}`;
}

function reviewHoursLines(
  hoursMode: "24-7" | "custom" | undefined,
  operatingHours:
    | Array<{
        dayOfWeek: number;
        opensAt: string | null;
        closesAt: string | null;
        isClosed: boolean;
      }>
    | undefined,
): Array<{ label: string; text: string; emphasize?: boolean }> {
  if (hoursMode === "24-7") {
    return [{ label: "Every day", text: "Open 24 hours" }];
  }
  if (!operatingHours?.length) {
    return [
      { label: "Mon - Fri", text: "08:00 AM - 08:00 PM" },
      { label: "Saturday", text: "09:00 AM - 03:00 PM" },
      { label: "Sunday", text: "Closed", emphasize: true },
    ];
  }
  const byDay = new Map(operatingHours.map((h) => [h.dayOfWeek, h]));
  return REVIEW_DAY_ORDER.map(({ dayOfWeek, label }) => {
    const row = byDay.get(dayOfWeek);
    if (!row || row.isClosed) {
      return { label, text: "Closed", emphasize: dayOfWeek === 0 };
    }
    const open = formatReviewTime(row.opensAt);
    const close = formatReviewTime(row.closesAt);
    if (!open || !close) {
      return { label, text: "Hours set" };
    }
    return { label, text: `${open} - ${close}` };
  });
}

const labelClass =
  "text-[10px] font-semibold uppercase tracking-[0.1em] text-[#94a3b8]";
const valueClass = "text-base font-semibold text-[#334155]";

const complianceDocs = [
  { title: "DEA Registration", file: "dea_cert_2024.pdf" },
  { title: "State Board License", file: "state_license_v2.jpg" },
  { title: "Liability Insurance", file: "ins_coverage.pdf" },
];

export function ReviewStepForm() {
  const router = useRouter();
  const { notify, withLoading, isLoading } = useAuraFeedback();
  const { draft, loading } = useOnboardingProgress();
  const completeOnboardingMutation = useCompleteOnboardingMutation();
  const [certified, setCertified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isBusy = isLoading("onboarding-complete");

  const documentLabel = useMemo(
    () => ({
      pharmacy_operation_license: "Pharmacy Operation License",
      pharmacist_in_charge_certificate: "Pharmacist-in-Charge Certificate",
    }),
    [],
  );
  const docs = draft?.documents ?? [];
  const branch = draft?.mainBranch;
  const hoursLines = useMemo(
    () => reviewHoursLines(branch?.hoursMode, branch?.operatingHours),
    [branch?.hoursMode, branch?.operatingHours],
  );
  const reviewDocuments = docs.length
    ? docs.map((document) => ({
        key: document.id,
        title:
          documentLabel[document.documentType as keyof typeof documentLabel] ?? document.documentType,
        fileName: document.fileName,
      }))
    : complianceDocs.map((document) => ({
        key: document.file,
        title: document.title,
        fileName: document.file,
      }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!certified) return;
    setError(null);

    try {
      const payload = await withLoading("onboarding-complete", "Finalizing your Aura workspace...", () =>
        completeOnboardingMutation.mutateAsync(),
      );

      notify({
        variant: "success",
        title: "Onboarding completed",
        description: "Your workspace is ready. Redirecting to the dashboard now.",
      });
      router.push(payload.redirectTo);
      router.refresh();
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Could not complete onboarding.";
      setError(message);
      notify({
        variant: "error",
        title: "Completion failed",
        description: message,
      });
    }
  }

  if (loading && !draft) {
    return <div className="py-12 text-sm text-[var(--app-text-muted)]">Loading onboarding details...</div>;
  }

  return (
    <form
      className={`flex flex-col gap-10 transition ${isBusy ? "opacity-75" : ""}`}
      onSubmit={handleSubmit}
      aria-busy={isBusy}
    >
      <div className="space-y-3">
        <h1 className="font-[family-name:var(--font-manrope)] text-3xl font-extrabold tracking-tight text-[#191c1e]">
          Final Review
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-[var(--app-text-muted)]">
          Please ensure all medical facility details and licensing data are accurate. This
          information will be used for regulatory reporting and insurance claims processing.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Business Identity */}
        <div className="flex flex-col gap-8 rounded-xl bg-white p-8 shadow-sm lg:col-span-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex size-8 items-center justify-center rounded-lg bg-[#f0fdfa]">
                <span className="material-symbols-outlined notranslate text-lg text-[#006a65]">
                  apartment
                </span>
              </div>
              <h2 className="font-[family-name:var(--font-manrope)] text-xl font-bold text-[#1e293b]">
                Business Identity
              </h2>
            </div>
            <Link
              href={ROUTES.dashboard.onboarding.root}
              className="inline-flex items-center gap-2 rounded-lg bg-[rgba(0,106,101,0.05)] px-3 py-1.5 text-xs font-semibold text-[#006a65] transition hover:bg-[rgba(0,106,101,0.1)]"
            >
              <span className="material-symbols-outlined notranslate text-sm">edit</span>
              EDIT
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            <div className="space-y-1">
              <p className={labelClass}>Legal Pharmacy Name</p>
              <p className={valueClass}>{draft?.organization.legalName || "Not provided"}</p>
            </div>
            <div className="space-y-1">
              <p className={labelClass}>Tax Identification Number</p>
              <p className={valueClass}>{draft?.organization.taxId || "Not provided"}</p>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <p className={labelClass}>Registered HQ Address</p>
              <p className={valueClass}>
                {draft?.organization.street
                  ? `${draft.organization.street}, ${draft.organization.city}, ${draft.organization.state} ${draft.organization.zip}`
                  : "Not provided"}
              </p>
            </div>
            <div className="space-y-1">
              <p className={labelClass}>Contact Email</p>
              <p className={valueClass}>{draft?.organization.primaryEmail || "Not provided"}</p>
            </div>
            <div className="space-y-1">
              <p className={labelClass}>Entity Type</p>
              <p className={valueClass}>Limited Liability Company</p>
            </div>
          </div>
        </div>

        {/* Compliance */}
        <div className="flex flex-col gap-6 rounded-xl bg-white p-8 pb-24 shadow-sm lg:col-span-5">
          <div className="flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-manrope)] text-lg font-bold text-[#1e293b]">
              Compliance &amp; Licensing
            </h2>
            <Link
              href={ROUTES.dashboard.onboarding.license}
              className="rounded-lg p-2 text-[var(--app-text-muted)] hover:bg-[var(--app-surface-subtle)] hover:text-[var(--app-brand)]"
              aria-label="Edit documents"
            >
              <span className="material-symbols-outlined notranslate">edit_square</span>
            </Link>
          </div>
          <ul className="flex flex-col gap-5">
            {reviewDocuments.map((doc) => (
              <li
                key={doc.key}
                className="flex items-center justify-between gap-3 rounded-lg bg-[#f8fafc] p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="material-symbols-outlined notranslate shrink-0 text-[var(--app-text-muted)]">
                    description
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#334155]">{doc.title}</p>
                    <p className="truncate text-[10px] text-[var(--app-text-muted)]">{doc.fileName}</p>
                  </div>
                </div>
                <span className="material-symbols-outlined notranslate shrink-0 text-[#006a65]">
                  check_circle
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Branch row */}
        <div className="overflow-hidden rounded-xl bg-white shadow-sm lg:col-span-12">
          <div className="grid grid-cols-1 divide-y divide-[#f8fafc] md:grid-cols-3 md:divide-x md:divide-y-0">
            <div className="space-y-6 p-8">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined notranslate text-[var(--app-text-muted)]">
                  hub
                </span>
                <h3 className="font-[family-name:var(--font-manrope)] text-lg font-bold text-[#1e293b]">
                  Branch Identity
                </h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className={labelClass}>Public Label</p>
                  <p className="text-sm font-semibold text-[#334155]">
                    {branch?.branchName || "Not provided"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className={labelClass}>Branch ID</p>
                  <p className="text-sm font-semibold text-[#334155]">{branch?.id ?? "Pending"}</p>
                </div>
              </div>
            </div>

            <div className="space-y-6 p-8">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined notranslate text-[var(--app-text-muted)]">
                  location_on
                </span>
                <h3 className="font-[family-name:var(--font-manrope)] text-lg font-bold text-[#1e293b]">
                  Physical Location
                </h3>
              </div>
              <BranchLocationMapPreview
                latitude={branch?.latitude ?? null}
                longitude={branch?.longitude ?? null}
              />
              <p className="text-sm leading-relaxed text-[var(--app-text-muted)]">
                {branch?.branchLocation || "Not provided"}
              </p>
            </div>

            <div className="bg-[rgba(248,250,252,0.5)] p-8">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined notranslate text-[var(--app-text-muted)]">
                    schedule
                  </span>
                  <h3 className="font-[family-name:var(--font-manrope)] text-lg font-bold text-[#1e293b]">
                    Operating Hours
                  </h3>
                </div>
                <Link
                  href={ROUTES.dashboard.onboarding.pharmacyDetails}
                  className="text-sm font-semibold text-[#006a65] hover:underline"
                >
                  EDIT
                </Link>
              </div>
              <ul className="mt-6 space-y-2 text-sm">
                {hoursLines.map((line) => (
                  <li key={line.label} className="flex justify-between gap-4">
                    <span className="text-[var(--app-text-muted)]">{line.label}</span>
                    <span
                      className={`font-semibold ${line.emphasize ? "text-[#ba1a1a]" : "text-[#334155]"}`}
                    >
                      {line.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <AuraInlineAlert
          variant="error"
          title="Completion could not be finalized"
          description={error}
        />
      ) : null}

      <fieldset disabled={isBusy} className="contents">
      <div className="flex flex-col items-center border-t border-transparent pt-2">
        <label
          htmlFor="review-certify"
          className="flex max-w-xl cursor-pointer items-start gap-3 pb-8 text-left"
        >
          <input
            id="review-certify"
            type="checkbox"
            checked={certified}
            onChange={(e) => setCertified(e.target.checked)}
            className="mt-1 size-4 shrink-0 rounded border-[#cbd5e1] text-[#006a65] accent-[#006a65]"
          />
          <span className="text-sm leading-relaxed text-[var(--app-text-muted)]">
            I certify that all provided information is accurate to the best of my knowledge.
          </span>
        </label>

        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href={ROUTES.dashboard.onboarding.license}
            className={`px-8 py-4 text-center text-base font-semibold text-[var(--app-text-muted)] transition hover:text-[#1e293b] ${isBusy ? "pointer-events-none opacity-60" : ""}`}
          >
            Back to Documents
          </Link>
          <button
            type="submit"
            disabled={!certified || isBusy}
            className="relative inline-flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#0fb9b1] to-[#6366f1] px-12 py-4 text-base font-semibold text-white shadow-[0_20px_25px_-5px_rgba(15,185,177,0.3),0_8px_10px_-6px_rgba(15,185,177,0.3)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {completeOnboardingMutation.isPending ? "Completing Setup..." : "Complete Setup"}
            <span className="material-symbols-outlined notranslate text-xl">rocket_launch</span>
          </button>
        </div>

        <p className="mt-6 text-[11px] font-medium uppercase tracking-[0.2em] text-[#94a3b8]">
          Deployment Tier: Global-Standard-V4
        </p>
      </div>
      </fieldset>

      <button
        type="button"
        className="fixed bottom-[max(1rem,env(safe-area-inset-bottom,0px))] right-[max(1rem,env(safe-area-inset-right,0px))] z-50 flex size-12 items-center justify-center rounded-full border border-[var(--app-surface-subtle)] bg-white shadow-lg transition hover:bg-[var(--app-surface-subtle)]"
        aria-label="Chat support"
      >
        <span className="material-symbols-outlined notranslate text-[var(--app-text-muted)]">chat</span>
      </button>
    </form>
  );
}
