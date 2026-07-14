"use client";

import { EngineApiError } from "@/lib/api/engine";

export function AdminSection({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 className="text-base font-bold text-[var(--app-text)]">{title}</h2>
          {subtitle ? <p className="text-xs text-[var(--app-text-muted)]">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export type AdminColumn<T> = {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  /** Right-align in the desktop table (numbers, dates, actions). */
  align?: "right";
  /** Drop from the mobile card — usually because it repeats the title. */
  hideOnCard?: boolean;
};

/**
 * One table, two shapes.
 *
 * Below `md` these tables render as cards; at `md` and up, as a real table. The
 * alternative — a single table with a min-width and a scrollbar — is what this
 * replaces: at 390px every one of these was 520–900px wide, so reading a row meant
 * swiping sideways and losing the row header, which is not a table anyone can use.
 *
 * The FIRST column is treated as the card's title (it is the entity name in every
 * admin table); the rest become label/value rows. Pass `renderCard` where a table
 * needs something better than that default — a row with actions in it, say.
 */
export function AdminTable<T>({
  columns,
  rows,
  getKey,
  empty,
  minWidth = 720,
  renderCard,
}: {
  columns: Array<AdminColumn<T>>;
  rows: T[];
  getKey: (row: T) => string;
  empty: string;
  /** Desktop-only: the width below which the table starts scrolling. */
  minWidth?: number;
  renderCard?: (row: T) => React.ReactNode;
}) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-[var(--app-text-muted)]">{empty}</p>;
  }

  const [title, ...rest] = columns;
  const cardColumns = rest.filter((c) => !c.hideOnCard);

  return (
    <>
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <article
            key={getKey(row)}
            className="rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-input-bg)] p-4"
          >
            {renderCard ? (
              renderCard(row)
            ) : (
              <>
                <div className="border-b border-[var(--app-border-ui)] pb-3">{title.cell(row)}</div>
                <dl className="mt-3 space-y-2">
                  {cardColumns.map((column) => (
                    <div key={column.key} className="flex items-baseline justify-between gap-3">
                      <dt className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--app-text-faint)]">
                        {column.header}
                      </dt>
                      <dd className="min-w-0 text-right text-sm text-[var(--app-text)]">
                        {column.cell(row)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto overscroll-x-contain md:block">
        <table className="w-full text-left text-sm" style={{ minWidth }}>
          <thead>
            <tr className="border-b border-[var(--app-border)] text-xs uppercase tracking-[0.08em] text-[var(--app-text-faint)]">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`pb-3 font-semibold ${column.align === "right" ? "text-right" : ""}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={getKey(row)} className="border-b border-[var(--app-border-ui)] last:border-0">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`py-3 align-top ${column.align === "right" ? "text-right" : ""}`}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/**
 * Error state for the console.
 *
 * `engine_not_configured` gets its own copy on purpose: it means
 * NEXT_PUBLIC_ENGINE_URL is unset, and a generic "something went wrong" would send
 * whoever hit it hunting through the code instead of the env file. A CORS failure
 * surfaces as a plain fetch TypeError, which gets the same treatment.
 */
export function AdminError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const engineError = error instanceof EngineApiError ? error : null;
  const misconfigured =
    engineError?.code === "engine_not_configured" ||
    (error instanceof TypeError && /fetch/i.test(error.message));

  return (
    <div className="rounded-xl border border-[#f2b8b5] bg-[#fdf3f3] p-5 text-sm text-[#7d2a2a]">
      <p className="font-semibold">
        {misconfigured ? "The admin console can't reach the engine." : "Something went wrong."}
      </p>
      <p className="mt-1">
        {engineError?.message ?? (error instanceof Error ? error.message : "Unknown error.")}
      </p>
      {misconfigured ? (
        <p className="mt-2 text-xs">
          Check that <code className="rounded bg-black/5 px-1">NEXT_PUBLIC_ENGINE_URL</code> points at
          the engine and that the engine&apos;s{" "}
          <code className="rounded bg-black/5 px-1">ALLOWED_ORIGINS</code> lists this origin. Both
          fail only in the browser — curl will look fine.
        </p>
      ) : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-lg border border-[#f2b8b5] px-3 py-1.5 text-xs font-bold transition hover:bg-white/50"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

// (EmptyRow is gone: AdminTable renders its own empty state, and a <tr colSpan>
// version only ever made sense inside a table that always existed.)

/**
 * Destructive-action confirm. Mirrors the tenant dashboard's pattern
 * (expenses-content.tsx) — no window.confirm anywhere in this codebase.
 */
export function ConfirmModal({
  title,
  body,
  confirmLabel,
  busy,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/40 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-title"
        className="w-full max-w-md rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-xl"
      >
        <h2
          id="admin-confirm-title"
          className="font-[family-name:var(--font-manrope)] text-lg font-extrabold text-[var(--app-text)]"
        >
          {title}
        </h2>
        <div className="mt-2 text-sm leading-relaxed text-[var(--app-text-muted)]">{body}</div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-[var(--app-border-ui)] px-4 py-2 text-sm font-semibold text-[var(--app-text-muted)] transition hover:bg-[var(--app-surface-subtle)] disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-lg bg-[#dc2626] px-4 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
