"use client";

import Link from "next/link";
import { useBranchDetailQuery } from "@/lib/queries/branches";
import { ROUTES } from "@/lib/routes";

export function BranchDetailContent({ branchId }: { branchId: string }) {
  const query = useBranchDetailQuery(branchId);
  const branch = query.data?.branch;

  if (query.isPending) {
    return <div className="px-4 py-10 text-sm text-[var(--app-text-muted)]">Loading branch…</div>;
  }
  if (query.isError) {
    return (
      <div className="px-4 py-10 text-sm text-red-600">
        Could not load branch. {query.error instanceof Error ? query.error.message : ""}
      </div>
    );
  }
  if (!branch) {
    return <div className="px-4 py-10 text-sm text-[var(--app-text-muted)]">Branch not found.</div>;
  }

  return (
    <div className="px-4 pb-16 pt-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1280px] space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h1 className="font-[family-name:var(--font-manrope)] text-3xl font-extrabold tracking-tight text-[var(--app-text)] sm:text-4xl sm:tracking-[-0.025em]">
              {branch.name}
            </h1>
            <p className="text-sm text-[var(--app-text-muted)]">
              Code <span className="font-mono">{branch.code}</span> · {branch.type.toUpperCase()} ·{" "}
              {branch.status.toUpperCase()}
            </p>
            <p className="text-sm text-[var(--app-text-muted)]">{branch.addressLine1}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={ROUTES.dashboard.organization}
              className="rounded-xl bg-[var(--app-input-bg)] px-4 py-2 text-sm font-semibold text-[var(--app-text)]"
            >
              Back
            </Link>
            <Link
              href={`${ROUTES.dashboard.organization}/branches/${encodeURIComponent(branchId)}/edit`}
              className="rounded-xl bg-gradient-to-br from-[#0fb9b1] to-[#6366f1] px-4 py-2 text-sm font-semibold text-white shadow-sm"
            >
              Edit branch
            </Link>
          </div>
        </div>

        <section className="grid gap-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--app-text-faint)]">
              Professional staff
            </p>
            <p className="mt-1 text-sm font-semibold text-[var(--app-text)]">
              {branch.professionalStaffCount}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--app-text-faint)]">
              Coordinates
            </p>
            <p className="mt-1 text-sm font-semibold text-[var(--app-text)] font-mono">
              {branch.latitude != null && branch.longitude != null
                ? `${branch.latitude.toFixed(5)}, ${branch.longitude.toFixed(5)}`
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--app-text-faint)]">
              Primary
            </p>
            <p className="mt-1 text-sm font-semibold text-[var(--app-text)]">
              {branch.isPrimary ? "Yes" : "No"}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

