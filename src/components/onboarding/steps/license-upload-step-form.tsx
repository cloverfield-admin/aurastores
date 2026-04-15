"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type DragEvent,
} from "react";
import { useAuraFeedback } from "@/components/providers/aura-feedback-provider";
import { useOnboardingProgress } from "@/components/onboarding/onboarding-progress-provider";
import { AuraInlineAlert } from "@/components/ui/aura-inline-alert";
import { useUploadLicenseMutation } from "@/lib/queries/onboarding";
import { ROUTES } from "@/lib/routes";
import { LicenseVerificationAside } from "@/components/onboarding/license-verification-aside";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function LicenseUploadStepForm() {
  const router = useRouter();
  const { notify, withLoading, isLoading } = useAuraFeedback();
  const { draft, loading } = useOnboardingProgress();
  const uploadLicenseMutation = useUploadLicenseMutation();
  const pharmacyInputRef = useRef<HTMLInputElement>(null);
  const picInputRef = useRef<HTMLInputElement>(null);
  const [pharmacyFile, setPharmacyFile] = useState<File | null>(null);
  const [pharmacyError, setPharmacyError] = useState<string | null>(null);
  const [picFile, setPicFile] = useState<File | null>(null);
  const [picError, setPicError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isBusy = isLoading("onboarding-license-upload");

  const validateAndSetPharmacy = useCallback((file: File | null) => {
    setPharmacyError(null);
    if (!file) {
      setPharmacyFile(null);
      return;
    }
    if (file.size > MAX_BYTES) {
      setPharmacyError("File must be 10MB or smaller.");
      return;
    }
    setPharmacyFile(file);
  }, []);

  const validateAndSetPic = useCallback((file: File | null) => {
    setPicError(null);
    if (!file) {
      setPicFile(null);
      return;
    }
    if (file.size > MAX_BYTES) {
      setPicError("File must be 10MB or smaller.");
      return;
    }
    setPicFile(file);
  }, []);

  function onPharmacyInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    validateAndSetPharmacy(f);
  }

  function onPicInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    validateAndSetPic(f);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) validateAndSetPharmacy(f);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!pharmacyFile || !picFile) {
      const message = "Upload both required compliance documents to continue.";
      setSubmitError(message);
      notify({
        variant: "warning",
        title: "Missing documents",
        description: message,
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.set("pharmacyLicense", pharmacyFile);
      formData.set("picCertificate", picFile);

      await withLoading("onboarding-license-upload", "Uploading and verifying your documents...", () =>
        uploadLicenseMutation.mutateAsync(formData),
      );
      notify({
        variant: "success",
        title: "Documents uploaded",
        description: "Compliance files were received successfully. Continue to final review.",
      });
      router.push(ROUTES.dashboard.onboarding.review);
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Could not upload compliance documents.";
      setSubmitError(message);
      notify({
        variant: "error",
        title: "Upload failed",
        description: message,
      });
    }
  }

  const pharmacyPreviewUrl =
    pharmacyFile?.type.startsWith("image/") ? URL.createObjectURL(pharmacyFile) : null;

  useEffect(() => {
    if (!pharmacyPreviewUrl) return;
    return () => URL.revokeObjectURL(pharmacyPreviewUrl);
  }, [pharmacyPreviewUrl]);

  if (loading && !draft) {
    return <div className="py-12 text-sm text-[var(--app-text-muted)]">Loading onboarding details...</div>;
  }

  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:gap-8">
      <div className="lg:col-span-8">
        <form
          className={`flex flex-col gap-10 transition ${isBusy ? "opacity-75" : ""}`}
          onSubmit={handleSubmit}
          aria-busy={isBusy}
        >
          <fieldset disabled={isBusy} className="contents">
          <div className="space-y-2">
            <span className="inline-block rounded bg-[rgba(0,106,101,0.1)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#006a65]">
              Step 3 of 4
            </span>
            <h1 className="font-[family-name:var(--font-manrope)] text-3xl font-extrabold tracking-tight text-[#191c1e] sm:text-[30px] sm:leading-9 sm:tracking-[-0.02em]">
              Setting up your License Verification
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-[#3c4948]">
              To ensure regulatory compliance and secure our clinical network, please provide
              high-resolution copies of your active pharmaceutical licenses.
            </p>
          </div>

          <input
            ref={pharmacyInputRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            onChange={onPharmacyInputChange}
          />
          <input
            ref={picInputRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            onChange={onPicInputChange}
          />

          {/* Pharmacy Operation License */}
          <div className="relative flex flex-col gap-6 rounded-xl bg-white p-8 shadow-[0_0_40px_-10px_rgba(15,185,177,0.15)]">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-[rgba(0,106,101,0.05)]">
                <span className="material-symbols-outlined notranslate text-2xl text-[#006a65]">
                  local_pharmacy
                </span>
              </div>
              <div>
                <h2 className="font-[family-name:var(--font-manrope)] text-lg font-bold text-[#191c1e]">
                  Pharmacy Operation License
                </h2>
                <p className="mt-1 text-sm text-[#3c4948]">
                  Issued by the State Board of Pharmacies
                </p>
              </div>
            </div>

            <div
              role="button"
              tabIndex={isBusy ? -1 : 0}
              onKeyDown={(ev) => {
                if (!isBusy && (ev.key === "Enter" || ev.key === " ")) pharmacyInputRef.current?.click();
              }}
              onDragEnter={(e) => {
                if (isBusy) return;
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                if (isBusy) return;
                onDrop(e);
              }}
              onClick={() => {
                if (!isBusy) pharmacyInputRef.current?.click();
              }}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[rgba(187,201,199,0.35)] bg-[rgba(242,244,246,0.5)] px-6 py-12 transition ${
                dragActive ? "border-[#006a65] bg-[#f0fdfa]/50" : "hover:border-[#006a65]/40"
              }`}
            >
              <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-white shadow-sm">
                <span className="material-symbols-outlined notranslate text-3xl text-[#006a65]">
                  cloud_upload
                </span>
              </div>
              <p className="text-center font-[family-name:var(--font-manrope)] text-base font-semibold text-[#191c1e]">
                Drag & Drop or{" "}
                <span className="text-[#006a65] underline decoration-[rgba(0,106,101,0.3)]">
                  Browse
                </span>
              </p>
              <p className="mt-2 text-center text-xs text-[#3c4948]">
                Supports PDF, JPG, PNG (Max 10MB)
              </p>
            </div>
            {pharmacyError ? (
              <AuraInlineAlert
                variant="error"
                title="Pharmacy license file issue"
                description={pharmacyError}
              />
            ) : null}

            <div className="flex min-h-[96px] items-center justify-center rounded-lg border border-[rgba(187,201,199,0.1)] bg-[rgba(230,232,234,0.2)] p-4">
              {pharmacyFile ? (
                <div className="flex w-full flex-col items-center gap-2 sm:flex-row sm:justify-between">
                  {pharmacyPreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- blob preview
                    <img
                      src={pharmacyPreviewUrl}
                      alt=""
                      className="max-h-20 max-w-full rounded object-contain"
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-[#3c4948]">
                      <span className="material-symbols-outlined notranslate text-[var(--app-text-muted)]">
                        picture_as_pdf
                      </span>
                      {pharmacyFile.name}
                    </div>
                  )}
                  <span className="text-xs text-[var(--app-text-muted)]">{formatSize(pharmacyFile.size)}</span>
                </div>
              ) : (
                <p className="text-center text-xs text-[rgba(60,73,72,0.6)]">
                  No file selected. Preview will appear here.
                </p>
              )}
            </div>
          </div>

          {/* PIC Certificate */}
          <div className="relative flex flex-col gap-6 rounded-xl bg-white p-8 shadow-[0_0_40px_-10px_rgba(15,185,177,0.15)]">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-[rgba(70,72,212,0.05)]">
                <span className="material-symbols-outlined notranslate text-2xl text-[#4648d4]">
                  badge
                </span>
              </div>
              <div>
                <h2 className="font-[family-name:var(--font-manrope)] text-lg font-bold text-[#191c1e]">
                  Pharmacist-in-Charge Certificate
                </h2>
                <p className="mt-1 text-sm text-[#3c4948]">
                  Official certification for the Lead Pharmacist
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-[rgba(187,201,199,0.2)] bg-[#f2f4f6] p-4 sm:flex-row sm:items-center sm:gap-4">
              <button
                type="button"
                onClick={() => picInputRef.current?.click()}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#6063ee] px-6 py-2.5 font-[family-name:var(--font-manrope)] text-sm font-bold text-white shadow-[0_10px_15px_-3px_rgba(70,72,212,0.2),0_4px_6px_-4px_rgba(70,72,212,0.2)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="material-symbols-outlined notranslate text-sm">upload</span>
                Upload Certificate
              </button>
              <div className="min-w-0 flex-1 text-xs text-[#3c4948]">
                {picFile ? (
                  <span>
                    Selected: <span className="font-medium">{picFile.name}</span> (
                    {formatSize(picFile.size)})
                  </span>
                ) : (
                  <span className="text-[#94a3b8]">No certificate selected yet.</span>
                )}
              </div>
              {picFile ? (
                <span
                  className="material-symbols-outlined notranslate shrink-0 text-green-600"
                  aria-label="Uploaded"
                >
                  check_circle
                </span>
              ) : null}
            </div>
            {picError ? (
              <AuraInlineAlert
                variant="error"
                title="PIC certificate file issue"
                description={picError}
              />
            ) : null}
          </div>

          <div className="flex flex-col-reverse items-stretch justify-between gap-4 pt-2 sm:flex-row sm:items-center">
            <Link
              href={ROUTES.dashboard.onboarding.pharmacyDetails}
              className="inline-flex items-center justify-center gap-2 font-[family-name:var(--font-manrope)] text-base font-bold text-[#3c4948] transition hover:text-[#191c1e]"
            >
              <span className="material-symbols-outlined notranslate text-lg">arrow_back</span>
              Back to Details
            </Link>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#0fb9b1] to-[#6063ee] px-10 py-4 font-[family-name:var(--font-manrope)] text-lg font-extrabold text-white shadow-[0_20px_25px_-5px_rgba(20,184,166,0.2),0_8px_10px_-6px_rgba(20,184,166,0.2)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploadLicenseMutation.isPending ? "Uploading..." : "Next: Final Review"}
              <span className="material-symbols-outlined notranslate text-base">arrow_forward</span>
            </button>
          </div>
          </fieldset>
          {submitError ? (
            <AuraInlineAlert
              variant="error"
              title="Compliance upload could not continue"
              description={submitError}
            />
          ) : null}
        </form>
      </div>

      <div className="lg:col-span-4">
        <div className="lg:sticky lg:top-24">
          <LicenseVerificationAside />
        </div>
      </div>
    </div>
  );
}
