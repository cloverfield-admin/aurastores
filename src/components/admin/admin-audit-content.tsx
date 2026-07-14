"use client";

import { useState } from "react";
import { AdminError, AdminSection } from "@/components/admin/admin-primitives";
import { dateTime, humanize } from "@/components/admin/format";
import { useAdminAuditLogQuery, type AdminAuditRecord } from "@/lib/queries/admin";

const ACTIONS = [
  "",
  "organization.updated",
  "organization.status",
  "organization.deletion_scheduled",
  "organization.deletion_canceled",
  "subscription.set_plan",
  "subscription.grant_trial",
  "subscription.extend_trial",
  "subscription.cancel",
  "user.status",
  "membership.status",
  "impersonation.start",
  "plan_price.upsert",
];

export function AdminAuditContent() {
  const [action, setAction] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const audit = useAdminAuditLogQuery({ actor: "", organizationId: "", action });
  const entries = audit.data?.pages.flatMap((p) => p.data.entries) ?? [];

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="font-[family-name:var(--font-manrope)] text-2xl font-extrabold tracking-tight sm:text-3xl text-[var(--app-text)]">
          Audit log
        </h1>
        <p className="text-sm text-[var(--app-text-muted)]">
          Every change a platform admin has made, and who made it. Written in the same transaction as
          the change itself, so there is nothing here that didn&apos;t happen and nothing that
          happened without a row.
        </p>
      </header>

      <AdminSection
        title="Activity"
        subtitle="Newest first"
        action={
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="w-full rounded-lg border border-[var(--app-border-ui)] bg-[var(--app-input-bg)] px-3 py-2 text-sm text-[var(--app-text)] outline-none sm:w-auto"
          >
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a ? humanize(a.replace(".", " · ")) : "All actions"}
              </option>
            ))}
          </select>
        }
      >
        {audit.isError ? (
          <AdminError error={audit.error} onRetry={() => void audit.refetch()} />
        ) : audit.isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-[var(--app-surface-muted)]" />
            ))}
          </div>
        ) : (
          <>
            {entries.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--app-text-muted)]">
                Nothing here yet.
              </p>
            ) : (
              <>
                {/* The audit log doesn't go through AdminTable: its expandable diff is
                    a second <tr>, which the generic one-row-per-record model can't
                    express. Same two shapes, hand-rolled. */}
                <div className="space-y-3 md:hidden">
                  {entries.map((entry) => (
                    <AuditCard
                      key={entry.id}
                      entry={entry}
                      expanded={expanded === entry.id}
                      onToggle={() => setExpanded(expanded === entry.id ? null : entry.id)}
                    />
                  ))}
                </div>

                <div className="hidden overflow-x-auto overscroll-x-contain md:block">
                  <table className="w-full min-w-[880px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--app-border)] text-xs uppercase tracking-[0.08em] text-[var(--app-text-faint)]">
                        <th className="pb-3 font-semibold">When</th>
                        <th className="pb-3 font-semibold">Who</th>
                        <th className="pb-3 font-semibold">Action</th>
                        <th className="pb-3 font-semibold">What happened</th>
                        <th className="pb-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((entry) => (
                        <AuditRow
                          key={entry.id}
                          entry={entry}
                          expanded={expanded === entry.id}
                          onToggle={() => setExpanded(expanded === entry.id ? null : entry.id)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {audit.hasNextPage ? (
              <button
                type="button"
                onClick={() => void audit.fetchNextPage()}
                disabled={audit.isFetchingNextPage}
                className="mt-5 w-full rounded-lg border border-[var(--app-border-ui)] py-2.5 text-sm font-semibold text-[var(--app-text-muted)] transition hover:bg-[var(--app-surface-subtle)] disabled:opacity-60"
              >
                {audit.isFetchingNextPage ? "Loading…" : "Load more"}
              </button>
            ) : null}
          </>
        )}
      </AdminSection>
    </div>
  );
}

function AuditRow({
  entry,
  expanded,
  onToggle,
}: {
  entry: AdminAuditRecord;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasPayload = Boolean(entry.payload_before || entry.payload_after);

  return (
    <>
      <tr className="border-b border-[var(--app-border-ui)] last:border-0">
        <td className="whitespace-nowrap py-3 text-[var(--app-text-muted)]">
          {dateTime(entry.created_at)}
        </td>
        <td className="py-3">
          {/* The email is a SNAPSHOT taken when the action happened. It survives the
              actor being deleted, which a foreign key alone would not. */}
          <p className="font-semibold text-[var(--app-text)]">{entry.actor_email || "Unknown"}</p>
          {entry.ip_address ? (
            <p className="text-[11px] text-[var(--app-text-faint)]">{entry.ip_address}</p>
          ) : null}
        </td>
        <td className="py-3">
          <code className="rounded bg-[var(--app-surface-subtle)] px-1.5 py-0.5 text-[11px] text-[var(--app-text-muted)]">
            {entry.action}
          </code>
        </td>
        <td className="py-3 text-[var(--app-text)]">{entry.summary}</td>
        <td className="py-3 text-right">
          {hasPayload ? (
            <button
              type="button"
              onClick={onToggle}
              className="rounded-lg border border-[var(--app-border-ui)] px-2 py-1 text-[11px] font-bold text-[var(--app-text-muted)] transition hover:bg-[var(--app-surface-subtle)]"
            >
              {expanded ? "Hide" : "Diff"}
            </button>
          ) : null}
        </td>
      </tr>
      {expanded && hasPayload ? (
        <tr className="border-b border-[var(--app-border-ui)]">
          <td colSpan={5} className="bg-[var(--app-surface-subtle)]/50 px-3 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Payload title="Before" payload={entry.payload_before} />
              <Payload title="After" payload={entry.payload_after} />
            </div>
            {entry.correlation_id ? (
              <p className="mt-3 text-[11px] text-[var(--app-text-faint)]">
                Correlation id{" "}
                <code className="rounded bg-[var(--app-surface)] px-1">{entry.correlation_id}</code> —
                use it to find every log line for this request in the engine.
              </p>
            ) : null}
          </td>
        </tr>
      ) : null}
    </>
  );
}

function Payload({ title, payload }: { title: string; payload: Record<string, unknown> | null }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--app-text-faint)]">
        {title}
      </p>
      <pre className="overflow-x-auto rounded-lg border border-[var(--app-border-ui)] bg-[var(--app-surface)] p-3 text-[11px] leading-relaxed text-[var(--app-text-muted)]">
        {payload ? JSON.stringify(payload, null, 2) : "—"}
      </pre>
    </div>
  );
}

/** The audit log's mobile shape: a summary you can read, with the diff behind a tap. */
function AuditCard({
  entry,
  expanded,
  onToggle,
}: {
  entry: AdminAuditRecord;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasPayload = Boolean(entry.payload_before || entry.payload_after);

  return (
    <article className="rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-input-bg)] p-4">
      <div className="flex items-start justify-between gap-3">
        <code className="rounded bg-[var(--app-surface-subtle)] px-1.5 py-0.5 text-[10px] text-[var(--app-text-muted)]">
          {entry.action}
        </code>
        <span className="shrink-0 text-[11px] text-[var(--app-text-faint)]">
          {dateTime(entry.created_at)}
        </span>
      </div>

      <p className="mt-2 text-sm text-[var(--app-text)]">{entry.summary}</p>

      <p className="mt-2 text-[11px] text-[var(--app-text-faint)]">
        by <span className="font-semibold">{entry.actor_email || "Unknown"}</span>
        {entry.ip_address ? ` · ${entry.ip_address}` : ""}
      </p>

      {hasPayload ? (
        <>
          <button
            type="button"
            onClick={onToggle}
            className="mt-3 w-full rounded-lg border border-[var(--app-border-ui)] py-2 text-[11px] font-bold text-[var(--app-text-muted)] transition hover:bg-[var(--app-surface-subtle)]"
          >
            {expanded ? "Hide changes" : "Show what changed"}
          </button>
          {expanded ? (
            <div className="mt-3 space-y-3">
              <Payload title="Before" payload={entry.payload_before} />
              <Payload title="After" payload={entry.payload_after} />
            </div>
          ) : null}
        </>
      ) : null}
    </article>
  );
}
