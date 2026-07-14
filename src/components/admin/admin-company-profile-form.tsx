"use client";

import { useState } from "react";
import { AdminSection } from "@/components/admin/admin-primitives";
import { useAuraFeedback } from "@/components/providers/aura-feedback-provider";
import { EngineApiError } from "@/lib/api/engine";
import {
  useAdminUpdateOrganizationMutation,
  type AdminOrgPatch,
  type AdminOrgProfile,
} from "@/lib/queries/admin";

type Draft = {
  display_name: string;
  legal_name: string;
  legal_entity_type: string;
  tax_id: string;
  primary_email: string;
  primary_phone: string;
  hq_address_line_1: string;
  hq_address_line_2: string;
  hq_city: string;
  hq_state: string;
  hq_postal_code: string;
  hq_country: string;
  store_vertical: string;
  sales_tax_enabled: boolean;
  sales_tax_rate_bps: number;
};

function toDraft(p: AdminOrgProfile): Draft {
  return {
    display_name: p.display_name,
    legal_name: p.legal_name ?? "",
    legal_entity_type: p.legal_entity_type,
    tax_id: p.tax_id ?? "",
    primary_email: p.primary_email,
    primary_phone: p.primary_phone ?? "",
    hq_address_line_1: p.hq_address_line_1 ?? "",
    hq_address_line_2: p.hq_address_line_2 ?? "",
    hq_city: p.hq_city ?? "",
    hq_state: p.hq_state ?? "",
    hq_postal_code: p.hq_postal_code ?? "",
    hq_country: p.hq_country,
    store_vertical: p.store_vertical,
    sales_tax_enabled: p.sales_tax_enabled,
    sales_tax_rate_bps: p.sales_tax_rate_bps,
  };
}

/** Fields where an empty string means "clear it" (the column is nullable). */
const NULLABLE = new Set([
  "legal_name",
  "tax_id",
  "primary_phone",
  "hq_address_line_1",
  "hq_address_line_2",
  "hq_city",
  "hq_state",
  "hq_postal_code",
]);

/**
 * Builds a patch of ONLY the fields the admin actually changed.
 *
 * The engine's PATCH is tri-state (absent = leave, null = clear, value = set), so
 * sending the whole form would rewrite — and audit — fields nobody touched, burying
 * the one real change in noise.
 */
function buildPatch(draft: Draft, original: Draft): AdminOrgPatch {
  const patch: Record<string, unknown> = {};
  for (const key of Object.keys(draft) as Array<keyof Draft>) {
    if (draft[key] === original[key]) continue;
    const value = draft[key];
    if (typeof value === "string" && value.trim() === "" && NULLABLE.has(key)) {
      patch[key] = null;
      continue;
    }
    patch[key] = typeof value === "string" ? value.trim() : value;
  }
  return patch as AdminOrgPatch;
}

export function AdminCompanyProfileForm({
  orgId,
  profile,
}: {
  orgId: string;
  profile: AdminOrgProfile;
}) {
  const original = toDraft(profile);
  const [draft, setDraft] = useState<Draft>(original);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { notify, withLoading, isLoading } = useAuraFeedback();
  const update = useAdminUpdateOrganizationMutation();

  const busy = isLoading("admin:update-company");
  const patch = buildPatch(draft, original);
  const dirty = Object.keys(patch).length > 0;

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function save() {
    setFieldErrors({});
    try {
      await withLoading("admin:update-company", "Saving company…", () =>
        update.mutateAsync({ orgId, patch }),
      );
      notify({
        variant: "success",
        title: "Company updated",
        description: `Changed ${Object.keys(patch).join(", ")}.`,
      });
    } catch (error) {
      if (error instanceof EngineApiError) {
        setFieldErrors(error.fieldErrors());
        notify({ variant: "error", title: "Could not save", description: error.message });
        return;
      }
      notify({
        variant: "error",
        title: "Could not save",
        description: error instanceof Error ? error.message : "Unknown error.",
      });
    }
  }

  return (
    <AdminSection
      title="Company information"
      subtitle="Only the fields you change are written, and each one is recorded in the audit log"
      action={
        <button
          type="button"
          onClick={() => void save()}
          disabled={!dirty || busy}
          className="rounded-lg bg-[var(--app-brand)] px-4 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Saving…" : dirty ? `Save ${Object.keys(patch).length} change(s)` : "No changes"}
        </button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Display name" error={fieldErrors.display_name}>
          <Input value={draft.display_name} onChange={(v) => set("display_name", v)} />
        </Field>
        <Field label="Legal name" error={fieldErrors.legal_name}>
          <Input value={draft.legal_name} onChange={(v) => set("legal_name", v)} />
        </Field>
        <Field label="Primary email" error={fieldErrors.primary_email}>
          <Input value={draft.primary_email} onChange={(v) => set("primary_email", v)} type="email" />
        </Field>
        <Field label="Primary phone" error={fieldErrors.primary_phone}>
          <Input value={draft.primary_phone} onChange={(v) => set("primary_phone", v)} />
        </Field>
        <Field label="Legal entity type" error={fieldErrors.legal_entity_type}>
          <Select
            value={draft.legal_entity_type}
            onChange={(v) => set("legal_entity_type", v)}
            options={[
              "sole_proprietorship",
              "llc",
              "corporation",
              "partnership",
              "nonprofit",
              "other",
            ]}
          />
        </Field>
        <Field label="Tax ID" error={fieldErrors.tax_id}>
          <Input value={draft.tax_id} onChange={(v) => set("tax_id", v)} />
        </Field>
        <Field label="Store vertical" error={fieldErrors.store_vertical}>
          <Select
            value={draft.store_vertical}
            onChange={(v) => set("store_vertical", v)}
            options={["pharmacy", "general_retail"]}
          />
        </Field>
        <Field label="Country (2-letter)" error={fieldErrors.hq_country}>
          <Input
            value={draft.hq_country}
            onChange={(v) => set("hq_country", v.toUpperCase().slice(0, 2))}
          />
        </Field>

        <Field label="Address line 1" error={fieldErrors.hq_address_line_1}>
          <Input value={draft.hq_address_line_1} onChange={(v) => set("hq_address_line_1", v)} />
        </Field>
        <Field label="Address line 2" error={fieldErrors.hq_address_line_2}>
          <Input value={draft.hq_address_line_2} onChange={(v) => set("hq_address_line_2", v)} />
        </Field>
        <Field label="City" error={fieldErrors.hq_city}>
          <Input value={draft.hq_city} onChange={(v) => set("hq_city", v)} />
        </Field>
        <Field label="State / province" error={fieldErrors.hq_state}>
          <Input value={draft.hq_state} onChange={(v) => set("hq_state", v)} />
        </Field>
        <Field label="Postal code" error={fieldErrors.hq_postal_code}>
          <Input value={draft.hq_postal_code} onChange={(v) => set("hq_postal_code", v)} />
        </Field>

        <Field label="Sales tax rate (basis points)" error={fieldErrors.sales_tax_rate_bps}>
          <Input
            value={String(draft.sales_tax_rate_bps)}
            onChange={(v) => set("sales_tax_rate_bps", Number.parseInt(v, 10) || 0)}
            inputMode="numeric"
          />
          <p className="mt-1 text-[11px] text-[var(--app-text-faint)]">
            1600 = 16.00%. Currently {(draft.sales_tax_rate_bps / 100).toFixed(2)}%.
          </p>
        </Field>
        <Field label="Sales tax">
          <label className="flex items-center gap-2 py-2 text-sm text-[var(--app-text)]">
            <input
              type="checkbox"
              checked={draft.sales_tax_enabled}
              onChange={(e) => set("sales_tax_enabled", e.target.checked)}
              className="size-4 rounded border-[var(--app-border-ui)]"
            />
            Charge sales tax on this store&apos;s sales
          </label>
        </Field>
      </div>
    </AdminSection>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-text-faint)]">
        {label}
      </label>
      {children}
      {error ? <p className="text-[11px] font-semibold text-[#7d2a2a]">{error}</p> : null}
    </div>
  );
}

function Input({
  value,
  onChange,
  type,
  inputMode,
}: {
  value: string;
  onChange: (value: string) => void;
  type?: string;
  inputMode?: "numeric" | "decimal";
}) {
  return (
    <input
      value={value}
      type={type}
      inputMode={inputMode}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-[var(--app-border-ui)] bg-[var(--app-input-bg)] px-3 py-2 text-sm text-[var(--app-text)] outline-none focus:bg-[var(--app-input-focus-bg)]"
    />
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-[var(--app-border-ui)] bg-[var(--app-input-bg)] px-3 py-2 text-sm text-[var(--app-text)] outline-none"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o.replace(/_/g, " ")}
        </option>
      ))}
    </select>
  );
}
