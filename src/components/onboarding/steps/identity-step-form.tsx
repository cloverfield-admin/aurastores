"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAuraFeedback } from "@/components/providers/aura-feedback-provider";
import { useOnboardingProgress } from "@/components/onboarding/onboarding-progress-provider";
import { AuraInlineAlert } from "@/components/ui/aura-inline-alert";
import { useSaveIdentityMutation } from "@/lib/queries/onboarding";
import { ROUTES } from "@/lib/routes";

const fieldLabel =
  "mb-2 block text-xs font-semibold uppercase tracking-[0.06em] text-[#3c4948]";

const inputBase =
  "w-full rounded-xl border border-transparent bg-[#e0e3e5] px-4 py-[18px] text-base text-[#191c1e] outline-none placeholder:text-[#6c7a78] focus:border-[#006a65]/25 focus:ring-2 focus:ring-[#006a65]/20";

export function IdentityStepForm() {
  const { draft, loading } = useOnboardingProgress();

  if (loading && !draft) {
    return <div className="py-12 text-sm text-[var(--app-text-muted)]">Loading onboarding details...</div>;
  }

  if (!draft) {
    return (
      <div className="py-12">
        <AuraInlineAlert
          variant="error"
          title="Onboarding data unavailable"
          description="We couldn’t load your onboarding details right now. Refresh and try again."
        />
      </div>
    );
  }

  const draftKey = [
    draft.organization.legalName,
    draft.organization.taxId,
    draft.organization.primaryPhone,
    draft.organization.street,
    draft.organization.city,
    draft.organization.state,
    draft.organization.zip,
  ].join("|");

  return <IdentityStepFormFields key={draftKey} draft={draft} />;
}

function IdentityStepFormFields({
  draft,
}: {
  draft: NonNullable<ReturnType<typeof useOnboardingProgress>["draft"]>;
}) {
  const router = useRouter();
  const { notify, withLoading, isLoading } = useAuraFeedback();
  const saveIdentityMutation = useSaveIdentityMutation();
  const [legalName, setLegalName] = useState(draft.organization.legalName);
  const [taxId, setTaxId] = useState(draft.organization.taxId);
  const [phone, setPhone] = useState(draft.organization.primaryPhone);
  const [street, setStreet] = useState(draft.organization.street);
  const [city, setCity] = useState(draft.organization.city);
  const [state, setState] = useState(draft.organization.state);
  const [zip, setZip] = useState(draft.organization.zip);
  const [error, setError] = useState<string | null>(null);
  const isBusy = isLoading("onboarding-identity");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    try {
      await withLoading("onboarding-identity", "Saving your pharmacy identity...", () =>
        saveIdentityMutation.mutateAsync({
          legalName,
          taxId,
          phone,
          street,
          city,
          state,
          zip,
        }),
      );
      notify({
        variant: "success",
        title: "Identity saved",
        description: "Business details verified locally. Continue to branch setup.",
      });
      router.push(ROUTES.dashboard.onboarding.pharmacyDetails);
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Could not save business identity.";
      setError(message);
      notify({
        variant: "error",
        title: "Identity save failed",
        description: message,
      });
    }
  }

  return (
    <form
      className={`flex flex-col gap-12 transition ${isBusy ? "opacity-75" : ""}`}
      onSubmit={handleSubmit}
      aria-busy={isBusy}
    >
      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#006a65]">
          Step 1 of 4
        </p>
        <h1 className="font-[family-name:var(--font-manrope)] text-4xl font-extrabold tracking-tight text-[#191c1e] sm:text-5xl sm:leading-[48px] sm:tracking-[-0.02em]">
          Business Identity
        </h1>
        <p className="max-w-2xl pt-2 text-lg leading-relaxed text-[#3c4948]">
          This information helps us verify your pharmacy for clinical compliance. Please
          provide the official legal details of your business entity.
        </p>
      </div>

      <fieldset disabled={isBusy} className="flex flex-col gap-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <label className={fieldLabel} htmlFor="legalName">
              Pharmacy legal name
            </label>
            <input
              id="legalName"
              name="legalName"
              type="text"
              autoComplete="organization"
              placeholder="e.g. Aura Health Solutions LLC"
              className={inputBase}
              value={legalName}
              onChange={(event) => setLegalName(event.target.value)}
              required
            />
          </div>

          <div>
            <label className={fieldLabel} htmlFor="taxId">
              Tax ID / PIN
            </label>
            <div className="relative">
              <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-[#6c7a78]">
                shield
              </span>
              <input
                id="taxId"
                name="taxId"
                type="text"
                autoComplete="off"
                placeholder="XX-XXXXXXX"
                className={`${inputBase} pl-12`}
                value={taxId}
                onChange={(event) => setTaxId(event.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className={fieldLabel} htmlFor="phone">
              Primary contact number
            </label>
            <div className="relative">
              <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-[#6c7a78]">
                call
              </span>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                placeholder="+1 (555) 000-0000"
                className={`${inputBase} pl-12`}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
              />
            </div>
          </div>

          <div className="lg:col-span-2">
            <label className={fieldLabel} htmlFor="street">
              Business street address
            </label>
            <input
              id="street"
              name="street"
              type="text"
              autoComplete="street-address"
              placeholder="123 Clinical Way, Suite 400"
              className={inputBase}
              value={street}
              onChange={(event) => setStreet(event.target.value)}
              required
            />
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <input
                name="city"
                type="text"
                autoComplete="address-level2"
                placeholder="City"
                className={inputBase}
                value={city}
                onChange={(event) => setCity(event.target.value)}
                required
              />
              <input
                name="state"
                type="text"
                autoComplete="address-level1"
                placeholder="State"
                className={inputBase}
                value={state}
                onChange={(event) => setState(event.target.value)}
                required
              />
              <input
                name="zip"
                type="text"
                autoComplete="postal-code"
                placeholder="ZIP Code"
                className={inputBase}
                value={zip}
                onChange={(event) => setZip(event.target.value)}
                required
              />
            </div>
          </div>
        </div>

        <div className="flex gap-4 rounded-2xl border border-[rgba(187,201,199,0.15)] bg-[#f2f4f6] p-6">
          <span className="material-symbols-outlined notranslate shrink-0 text-[#006a65]">
            verified_user
          </span>
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-[#191c1e]">Data Verification Protocol</p>
            <p className="text-xs leading-relaxed text-[#3c4948]">
              Our automated system cross-references these details with federal and state
              pharmaceutical registries to ensure accelerated approval.
            </p>
          </div>
        </div>

        {error ? (
          <AuraInlineAlert
            variant="error"
            title="Could not save identity details"
            description={error}
          />
        ) : null}

        <div className="flex flex-col-reverse items-stretch justify-between gap-4 border-t border-[#e0e3e5] pt-8 sm:flex-row sm:items-center">
          <Link
            href={ROUTES.dashboard.main}
            className={`rounded-xl px-6 py-4 text-center text-base font-semibold text-[#3c4948] transition hover:bg-[#e0e3e5]/60 ${isBusy ? "pointer-events-none opacity-60" : ""}`}
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="relative flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0fb9b1] to-[#6063ee] px-10 py-4 text-base font-semibold text-white shadow-[0_10px_15px_-3px_rgba(15,185,177,0.2),0_4px_6px_-4px_rgba(15,185,177,0.2)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saveIdentityMutation.isPending ? "Saving..." : "Next: Pharmacy Details"}
            <span className="material-symbols-outlined notranslate text-base">
              arrow_forward
            </span>
          </button>
        </div>
      </fieldset>
    </form>
  );
}
