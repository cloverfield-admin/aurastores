"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useDashboardWorkspaceAccess } from "@/components/dashboard/dashboard-workspace";
import { MissingCapabilityNotice } from "@/components/dashboard/missing-capability-notice";
import { LockedCapabilityTease } from "@/components/dashboard/locked-capability-tease";
import { useAuraFeedback } from "@/components/providers/aura-feedback-provider";
import {
  useArchiveProductCategoryMutation,
  useCreateProductCategoryMutation,
  useProductCategoriesQuery,
  useRestoreProductCategoryMutation,
  useUpdateProductCategoryMutation,
  type ProductCategoryDto,
} from "@/lib/queries/product-categories";
import { useAppMeQuery } from "@/lib/queries/staff";
import { hasCapability } from "@/lib/rbac/capabilities";

const dateTime = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "2-digit",
});

type CategoryDraft = {
  name: string;
  description: string;
};

function CategoryModal({
  open,
  title,
  submitLabel,
  initial,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  submitLabel: string;
  initial: CategoryDraft;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (draft: CategoryDraft) => Promise<void>;
}) {
  const [draft, setDraft] = useState<CategoryDraft>(initial);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/35 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-[var(--app-surface)] p-6 shadow-2xl">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--app-brand)]">
            Product Categories
          </p>
          <h3 className="mt-1 font-[family-name:var(--font-manrope)] text-2xl font-bold text-[var(--app-text)]">
            {title}
          </h3>
          <p className="mt-1 text-sm text-[var(--app-text-muted)]">Organize products across your organization.</p>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-text-muted)]">
              Name
            </span>
            <input
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              className="w-full rounded-xl border-0 bg-[var(--app-input-bg)] px-4 py-3 text-sm text-[var(--app-text)] outline-none ring-1 ring-transparent focus:ring-[var(--app-link-teal)]/25"
              placeholder="e.g. Antibiotics"
              maxLength={120}
              autoFocus
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--app-text-muted)]">
              Description (optional)
            </span>
            <textarea
              value={draft.description}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              rows={4}
              className="w-full resize-none rounded-xl border-0 bg-[var(--app-input-bg)] px-4 py-3 text-sm text-[var(--app-text)] outline-none ring-1 ring-transparent focus:ring-[var(--app-link-teal)]/25"
              placeholder="Short guidance for how this category is used."
              maxLength={500}
            />
          </label>

          {error ? <p className="text-sm font-medium text-[#b42318]">{error}</p> : null}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl bg-[var(--app-input-bg)] px-4 py-2 text-sm font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-input-focus-bg)] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={async () => {
              await onSubmit({
                name: draft.name,
                description: draft.description,
              });
            }}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#0fb9b1] to-[#6366f1] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="material-symbols-outlined notranslate animate-spin text-base">
                progress_activity
              </span>
            ) : (
              <span className="material-symbols-outlined notranslate text-base">check</span>
            )}
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProductCategoriesContent() {
  const { withLoading, notify } = useAuraFeedback();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const workspace = useDashboardWorkspaceAccess();
  const canCatalog = hasCapability(workspace.capabilities, "catalog");
  const locked = !canCatalog;
  const meQuery = useAppMeQuery();
  const includeArchived = (searchParams.get("includeArchived") ?? "0") === "1";
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(searchParams.get("pageSize") ?? "10", 10) || 10));

  function replaceParams(next: URLSearchParams) {
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  const categoriesQuery = useProductCategoriesQuery({ includeArchived, page, pageSize, enabled: canCatalog });
  const categories = useMemo(() => categoriesQuery.data?.categories ?? [], [categoriesQuery.data]);
  const pagination = categoriesQuery.data?.pagination ?? {
    page: 1,
    pageSize,
    totalItems: 0,
    totalPages: 1,
  };
  const activeCount = categories.filter((c) => !c.archivedAt).length;
  const archivedCount = categories.filter((c) => Boolean(c.archivedAt)).length;

  const categoryLimit = meQuery.data?.entitlements?.limits?.categories ?? null;
  const categoryUsage = meQuery.data?.usage?.categories ?? null;
  const isCategoryLimitReached =
    categoryLimit != null && categoryUsage != null && categoryUsage >= categoryLimit;

  const [modal, setModal] = useState<
    | { open: false }
    | { open: true; mode: "create"; category?: undefined }
    | { open: true; mode: "edit"; category: ProductCategoryDto }
  >({ open: false });
  const [modalError, setModalError] = useState<string | null>(null);

  const createMutation = useCreateProductCategoryMutation();
  const editCategoryId = modal.open && modal.mode === "edit" ? modal.category.id : null;
  const updateMutation = useUpdateProductCategoryMutation(editCategoryId ?? "");

  const archiveMutation = useArchiveProductCategoryMutation();
  const restoreMutation = useRestoreProductCategoryMutation();

  const isModalSubmitting =
    createMutation.isPending || (editCategoryId ? updateMutation.isPending : false);

  const sorted = useMemo(() => {
    return [...categories].sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

  async function submitDraft(draft: CategoryDraft) {
    const name = draft.name.trim();
    const description = draft.description.trim();

    if (name.length < 2) {
      setModalError("Name must be at least 2 characters.");
      return;
    }

    setModalError(null);

    if (modal.open && modal.mode === "edit") {
      await withLoading("product-categories-update", "Updating category...", async () => {
        await updateMutation.mutateAsync({
          name,
          description: description || undefined,
        });
      });
      notify({
        variant: "success",
        title: "Category updated",
        description: `${name} has been saved.`,
      });
      setModal({ open: false });
      return;
    }

    await withLoading("product-categories-create", "Creating category...", async () => {
      await createMutation.mutateAsync({
        name,
        description: description || undefined,
      });
    });
    notify({
      variant: "success",
      title: "Category created",
      description: `${name} is now available for product tagging.`,
    });
    setModal({ open: false });
  }

  async function archiveCategory(category: ProductCategoryDto) {
    await withLoading("product-categories-archive", "Archiving category...", async () => {
      await archiveMutation.mutateAsync({ categoryId: category.id });
    });
    notify({
      variant: "success",
      title: "Category archived",
      description: `${category.name} is now disabled.`,
    });
  }

  async function restoreCategory(category: ProductCategoryDto) {
    await withLoading("product-categories-restore", "Restoring category...", async () => {
      await restoreMutation.mutateAsync({ categoryId: category.id });
    });
    notify({
      variant: "success",
      title: "Category restored",
      description: `${category.name} is active again.`,
    });
  }

  const content = (
    <div className="px-4 pb-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1280px] space-y-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h1 className="font-[family-name:var(--font-manrope)] text-3xl font-extrabold tracking-tight text-[var(--app-text)] sm:text-4xl">
              Product Categories
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-[var(--app-text-secondary)]">
              Maintain the category library used across stock and sales workflows.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (isCategoryLimitReached) {
                notify({
                  variant: "info",
                  title: "Category limit reached",
                  description: `You’re at ${categoryUsage ?? 0}/${categoryLimit} active categories. Upgrade to add more.`,
                });
                return;
              }
              setModalError(null);
              setModal({ open: true, mode: "create" });
            }}
            title={
              isCategoryLimitReached && categoryLimit != null
                ? `Plan limit reached: ${categoryUsage ?? 0}/${categoryLimit} active categories. Upgrade to add more.`
                : undefined
            }
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-base font-semibold text-white shadow-[0px_10px_15px_-3px_rgba(20,184,166,0.2),0px_4px_6px_-4px_rgba(20,184,166,0.2)] transition ${
              isCategoryLimitReached ? "opacity-50" : "hover:opacity-95"
            }`}
            style={{
              background: "linear-gradient(137deg, rgb(15, 185, 177) 0%, rgb(99, 102, 241) 100%)",
            }}
          >
            <span className="material-symbols-outlined notranslate text-lg">
              {isCategoryLimitReached ? "lock" : "add"}
            </span>
            Add Category
          </button>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-[var(--app-shadow-card)]">
            <div className="flex items-center justify-between">
              <div className="flex size-10 items-center justify-center rounded-lg bg-[#f0fdfa]">
                <span className="material-symbols-outlined notranslate text-lg text-[var(--app-link-teal)]">
                  category
                </span>
              </div>
            </div>
            <p className="mt-6 font-[family-name:var(--font-manrope)] text-[30px] font-bold text-[var(--app-text)]">
              {categoriesQuery.isPending ? "—" : activeCount}
            </p>
            <p className="mt-2 text-sm font-medium text-[var(--app-text-muted)]">Active categories</p>
          </article>
          <article className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-[var(--app-shadow-card)]">
            <div className="flex items-center justify-between">
              <div className="flex size-10 items-center justify-center rounded-lg bg-[var(--app-surface-subtle)]">
                <span className="material-symbols-outlined notranslate text-lg text-[var(--app-text-muted)]">
                  inventory_2
                </span>
              </div>
            </div>
            <p className="mt-6 font-[family-name:var(--font-manrope)] text-[30px] font-bold text-[var(--app-text)]">
              {categoriesQuery.isPending ? "—" : archivedCount}
            </p>
            <p className="mt-2 text-sm font-medium text-[var(--app-text-muted)]">Archived categories</p>
          </article>

          <article className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-[var(--app-shadow-card)] sm:col-span-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--app-text-secondary)]">
                  Visibility
                </p>
                <p className="mt-1 text-sm text-[var(--app-text-muted)]">
                  Toggle archived categories for review or restore.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 rounded-xl bg-[var(--app-input-bg)] px-4 py-3 text-sm font-semibold text-[var(--app-text)]">
                <input
                  type="checkbox"
                  checked={includeArchived}
                  onChange={(event) => {
                    const params = new URLSearchParams(searchParams.toString());
                    params.set("includeArchived", event.target.checked ? "1" : "0");
                    params.set("page", "1");
                    replaceParams(params);
                  }}
                  className="size-4 rounded border-[var(--app-outline-variant)] text-[var(--app-link-teal)] focus:ring-[var(--app-link-teal)]"
                />
                Include archived
              </label>
            </div>
          </article>
        </div>

        <section className="overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
          <div className="flex items-center justify-between border-b border-[#f8fafc] px-6 py-5">
            <h2 className="font-[family-name:var(--font-manrope)] text-lg font-bold text-[var(--app-text)]">
              Category Directory
            </h2>
            <p className="text-xs font-medium text-[var(--app-text-muted)]">
              {categoriesQuery.isPending ? "Loading…" : `${pagination.totalItems.toLocaleString()} total`}
            </p>
          </div>

          {categoriesQuery.isError ? (
            <div className="px-6 py-10 text-sm text-[#b42318]">
              Could not load product categories. Try refreshing the page.
            </div>
          ) : categoriesQuery.isPending ? (
            <div className="px-6 py-10 text-sm text-[var(--app-text-muted)]">Loading categories…</div>
          ) : sorted.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="font-[family-name:var(--font-manrope)] text-xl font-bold text-[var(--app-text)]">
                No categories yet
              </p>
              <p className="mt-2 text-sm text-[var(--app-text-muted)]">
                Create your first category to start organizing products consistently.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (isCategoryLimitReached) {
                    notify({
                      variant: "info",
                      title: "Category limit reached",
                      description: `You’re at ${categoryUsage ?? 0}/${categoryLimit} active categories. Upgrade to add more.`,
                    });
                    return;
                  }
                  setModalError(null);
                  setModal({ open: true, mode: "create" });
                }}
                title={
                  isCategoryLimitReached && categoryLimit != null
                    ? `Plan limit reached: ${categoryUsage ?? 0}/${categoryLimit} active categories. Upgrade to add more.`
                    : undefined
                }
                className={`mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#0fb9b1] to-[#6366f1] px-5 py-2.5 text-sm font-semibold text-white ${
                  isCategoryLimitReached ? "opacity-50" : ""
                }`}
              >
                <span className="material-symbols-outlined notranslate text-lg">
                  {isCategoryLimitReached ? "lock" : "add"}
                </span>
                Create First Category
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto overscroll-x-contain">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="bg-[var(--app-input-bg)]">
                    <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-[1px] text-[var(--app-text-muted)]">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-[1px] text-[var(--app-text-muted)]">
                      Description
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-[1px] text-[var(--app-text-muted)]">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-[10px] font-semibold uppercase tracking-[1px] text-[var(--app-text-muted)]">
                      Updated
                    </th>
                    <th className="px-6 py-4 text-right text-[10px] font-semibold uppercase tracking-[1px] text-[var(--app-text-muted)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((category) => {
                    const archived = Boolean(category.archivedAt);
                    return (
                      <tr key={category.id} className="border-t border-[#f8fafc] transition hover:bg-[#fafafa]">
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold leading-5 text-[var(--app-text)]">{category.name}</p>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-faint)]">
                            {archived ? "Archived" : "Active"}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-sm text-[#475569]">
                          {category.description ?? "—"}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1.5 text-xs font-semibold ${
                              archived ? "bg-[var(--app-surface-subtle)] text-[#334155]" : "bg-[#f0fdfa] text-[var(--app-link-teal)]"
                            }`}
                          >
                            {archived ? "Archived" : "Active"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-[#475569]">
                          {dateTime.format(new Date(category.updatedAt))}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {!archived ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setModalError(null);
                                    setModal({ open: true, mode: "edit", category });
                                  }}
                                  className="rounded-md bg-[#eff6ff] px-3 py-1 text-[10px] font-semibold text-[#2563eb] hover:bg-[#dbeafe]"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => archiveCategory(category)}
                                  className="rounded-md bg-[var(--app-surface-subtle)] px-3 py-1 text-[10px] font-semibold text-[#334155] hover:bg-[var(--app-cancel-hover)]"
                                >
                                  Archive
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={async () => restoreCategory(category)}
                                className="rounded-md bg-[#0d9488] px-3 py-1 text-[10px] font-semibold text-white shadow-sm hover:bg-[#0f766e]"
                              >
                                Restore
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--app-text-faint)]">
            Showing page {pagination.page.toLocaleString()} of {pagination.totalPages.toLocaleString()} •{" "}
            {pagination.totalItems.toLocaleString()} categories
          </p>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--app-text-muted)]">
              Rows
              <select
                value={pageSize}
                onChange={(event) => {
                  const next = Number.parseInt(event.target.value, 10);
                  const params = new URLSearchParams(searchParams.toString());
                  params.set("pageSize", String(Number.isFinite(next) ? next : 10));
                  params.set("page", "1");
                  replaceParams(params);
                }}
                className="rounded-md border border-[var(--app-border-ui)] bg-[var(--app-surface)] px-2 py-1 text-xs font-semibold text-[var(--app-header-title)]"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </label>
            <button
              type="button"
              disabled={pagination.page <= 1 || categoriesQuery.isFetching}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(Math.max(1, pagination.page - 1)));
                replaceParams(params);
              }}
              className="flex size-8 items-center justify-center rounded border border-[var(--app-border-ui)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="material-symbols-outlined notranslate text-lg">chevron_left</span>
            </button>
            <span className="inline-flex min-w-14 items-center justify-center gap-1 rounded border border-[var(--app-brand)] bg-[var(--app-surface)] px-3 py-1 text-xs font-semibold text-[var(--app-brand)]">
              {categoriesQuery.isFetching ? (
                <span className="material-symbols-outlined notranslate animate-spin text-sm">progress_activity</span>
              ) : null}
              {pagination.page}
            </span>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages || categoriesQuery.isFetching}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(Math.min(pagination.totalPages, pagination.page + 1)));
                replaceParams(params);
              }}
              className="flex size-8 items-center justify-center rounded border border-[var(--app-border-ui)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="material-symbols-outlined notranslate text-lg">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      <CategoryModal
        key={
          modal.open
            ? modal.mode === "edit"
              ? `edit-${modal.category.id}`
              : "create"
            : "closed"
        }
        open={modal.open}
        title={modal.open && modal.mode === "edit" ? `Edit “${modal.category.name}”` : "Add new category"}
        submitLabel={modal.open && modal.mode === "edit" ? "Save Changes" : "Create Category"}
        initial={
          modal.open && modal.mode === "edit"
            ? { name: modal.category.name, description: modal.category.description ?? "" }
            : { name: "", description: "" }
        }
        isSubmitting={isModalSubmitting}
        error={
          modalError ??
          (createMutation.isError
            ? createMutation.error instanceof Error
              ? createMutation.error.message
              : "Unable to create category."
            : updateMutation.isError
              ? updateMutation.error instanceof Error
                ? updateMutation.error.message
                : "Unable to update category."
              : null)
        }
        onClose={() => setModal({ open: false })}
        onSubmit={submitDraft}
      />
    </div>
  );

  if (!locked) {
    return content;
  }

  return (
    <LockedCapabilityTease capability="catalog">
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 pb-2 pt-4 sm:px-6 lg:px-8">
        <MissingCapabilityNotice capability="catalog" variant="inline" className="max-w-3xl" />
      </div>
      {content}
    </LockedCapabilityTease>
  );
}

