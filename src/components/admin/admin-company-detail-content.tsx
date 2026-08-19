"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminError, AdminSection, AdminTable, ConfirmModal } from "@/components/admin/admin-primitives";
import { AdminCompanyProfileForm } from "@/components/admin/admin-company-profile-form";
import { AdminSubscriptionPanel } from "@/components/admin/admin-subscription-panel";
import { useImpersonation } from "@/components/admin/impersonation-provider";
import { count, date, humanize, money, relative, statusClass } from "@/components/admin/format";
import { TabButton } from "@/components/ui/kpi-card";
import { useAuraFeedback } from "@/components/providers/aura-feedback-provider";
import { EngineApiError } from "@/lib/api/engine";
import {
  useAdminCancelOrgDeletionMutation,
  useAdminOrganizationQuery,
  useAdminScheduleOrgDeletionMutation,
  useAdminSetMembershipStatusMutation,
  useAdminSetOrgStatusMutation,
  useAdminSetUserStatusMutation,
  useAdminStartImpersonationMutation,
  type AdminOrgMember,
} from "@/lib/queries/admin";
import { ROUTES } from "@/lib/routes";

type Tab = "overview" | "subscription" | "users" | "invoices";

type PendingAction =
  | { kind: "org_status"; status: string }
  | { kind: "schedule_deletion" }
  | { kind: "cancel_deletion" }
  | { kind: "user_status"; member: AdminOrgMember; status: "active" | "disabled" }
  | { kind: "membership_status"; member: AdminOrgMember; status: "active" | "suspended" }
  | null;

export function AdminCompanyDetailContent({ orgId }: { orgId: string }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [pending, setPending] = useState<PendingAction>(null);

  const router = useRouter();
  const { notify, withLoading, isLoading } = useAuraFeedback();
  const { start: startImpersonation } = useImpersonation();

  const org = useAdminOrganizationQuery(orgId);
  const setOrgStatus = useAdminSetOrgStatusMutation();
  const scheduleDeletion = useAdminScheduleOrgDeletionMutation();
  const cancelDeletion = useAdminCancelOrgDeletionMutation();
  const setUserStatus = useAdminSetUserStatusMutation();
  const setMembershipStatus = useAdminSetMembershipStatusMutation();
  const startImpersonationMutation = useAdminStartImpersonationMutation();

  const busy = isLoading("admin:company-action");

  async function run(label: string, task: () => Promise<unknown>) {
    try {
      await withLoading("admin:company-action", `${label}…`, task);
      notify({ variant: "success", title: label, description: "Done. The change is in the audit log." });
      setPending(null);
    } catch (error) {
      const message =
        error instanceof EngineApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "The change failed.";
      notify({ variant: "error", title: `${label} failed`, description: message });
    }
  }

  async function confirmPending() {
    if (!pending) return;
    switch (pending.kind) {
      case "org_status":
        return run(`Set status to ${humanize(pending.status)}`, () =>
          setOrgStatus.mutateAsync({ orgId, status: pending.status }),
        );
      case "schedule_deletion":
        return run("Schedule deletion", () => scheduleDeletion.mutateAsync({ orgId }));
      case "cancel_deletion":
        return run("Cancel deletion", () => cancelDeletion.mutateAsync({ orgId }));
      case "user_status":
        return run(
          pending.status === "disabled" ? "Disable account" : "Re-enable account",
          () =>
            setUserStatus.mutateAsync({
              orgId,
              userId: pending.member.user_id,
              status: pending.status,
            }),
        );
      case "membership_status":
        return run(
          pending.status === "suspended" ? "Suspend access" : "Restore access",
          () =>
            setMembershipStatus.mutateAsync({
              orgId,
              membershipId: pending.member.membership_id,
              status: pending.status,
            }),
        );
    }
  }

  async function handleViewAsStore() {
    try {
      const profile = await withLoading("admin:company-action", "Opening store view…", () =>
        startImpersonationMutation.mutateAsync({ orgId }),
      );
      startImpersonation(profile);
      router.push(ROUTES.admin.companyView(orgId));
    } catch (error) {
      notify({
        variant: "error",
        title: "Could not open the store view",
        description: error instanceof Error ? error.message : "Unknown error.",
      });
    }
  }

  if (org.isError) {
    return <AdminError error={org.error} onRetry={() => void org.refetch()} />;
  }
  if (org.isPending) {
    return <div className="h-64 animate-pulse rounded-xl bg-[var(--app-surface-muted)]" />;
  }

  const { profile, subscription, members, invoices } = org.data;

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <Link
          href={ROUTES.admin.companies}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--app-text-muted)] hover:text-[var(--app-link-teal)]"
        >
          <span aria-hidden className="material-symbols-outlined notranslate text-base">
            arrow_back
          </span>
          All companies
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-[family-name:var(--font-manrope)] text-2xl font-extrabold tracking-tight sm:text-3xl text-[var(--app-text)]">
                {profile.display_name}
              </h1>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClass(profile.status)}`}
              >
                {humanize(profile.status)}
              </span>
            </div>
            <p className="break-words text-sm text-[var(--app-text-muted)]">
              {profile.slug} · {profile.primary_email} · joined {date(org.data.created_at)}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleViewAsStore()}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--app-border-ui)] px-4 py-2 text-sm font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-surface-subtle)] disabled:opacity-60 sm:w-auto"
          >
            <span aria-hidden className="material-symbols-outlined notranslate text-lg">
              visibility
            </span>
            View as store
          </button>
        </div>

        {org.data.deletion_scheduled_at ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#f2b8b5] bg-[#fdf3f3] p-4 text-sm text-[#7d2a2a]">
            <p>
              <strong>This company is scheduled for deletion</strong>{" "}
              {relative(org.data.deletion_scheduled_at)} (
              {date(org.data.deletion_scheduled_at)}). All of its data will be permanently purged.
            </p>
            <button
              type="button"
              onClick={() => setPending({ kind: "cancel_deletion" })}
              className="shrink-0 rounded-lg bg-[#7d2a2a] px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90"
            >
              Cancel deletion
            </button>
          </div>
        ) : null}
      </header>

      <div className="flex flex-wrap gap-2">
        {(["overview", "subscription", "users", "invoices"] as Tab[]).map((t) => (
          <TabButton key={t} active={tab === t} onClick={() => setTab(t)}>
            {humanize(t)}
          </TabButton>
        ))}
      </div>

      {tab === "overview" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Team" value={count(members.length)} />
            <Metric label="Branches" value={count(org.data.branches)} />
            <Metric label="Products" value={count(org.data.products)} />
            <Metric label="GMV (30d)" value={money(org.data.gmv_cents_30d)} />
          </div>

          <AdminCompanyProfileForm orgId={orgId} profile={profile} />

          <AdminSection
            title="Danger zone"
            subtitle="These actions take effect on every member's next request"
          >
            <div className="space-y-3">
              {profile.status === "suspended" ? (
                <DangerRow
                  title="Reactivate this company"
                  body="Restore access for everyone at this store."
                  action="Reactivate"
                  tone="safe"
                  disabled={busy}
                  onClick={() => setPending({ kind: "org_status", status: "active" })}
                />
              ) : (
                <DangerRow
                  title="Suspend this company"
                  body="Everyone at this store is locked out of the dashboard and the mobile app until you reactivate it. Their data is untouched."
                  action="Suspend"
                  disabled={busy}
                  onClick={() => setPending({ kind: "org_status", status: "suspended" })}
                />
              )}

              {profile.status !== "archived" ? (
                <DangerRow
                  title="Archive this company"
                  body="Locks the store out permanently, but keeps every record. Use this when a store closes for good but you still need its history."
                  action="Archive"
                  disabled={busy}
                  onClick={() => setPending({ kind: "org_status", status: "archived" })}
                />
              ) : null}

              {!org.data.deletion_scheduled_at ? (
                <DangerRow
                  title="Delete this company"
                  body="Schedules the store and ALL of its data — sales, stock, staff, everything — to be permanently purged in 30 days. It stays fully usable until then, and you can cancel at any point in that window."
                  action="Schedule deletion"
                  disabled={busy}
                  onClick={() => setPending({ kind: "schedule_deletion" })}
                />
              ) : null}
            </div>
          </AdminSection>
        </>
      ) : null}

      {tab === "subscription" ? (
        <AdminSubscriptionPanel orgId={orgId} subscription={subscription} />
      ) : null}

      {tab === "users" ? (
        <AdminSection
          title="People"
          subtitle="Everyone with a membership at this store"
          action={
            <p className="text-[11px] text-[var(--app-text-faint)] sm:max-w-sm sm:text-right">
              <strong>Suspend</strong> revokes access to this store only.{" "}
              <strong>Disable account</strong> locks the person out of every store on AuraStores.
            </p>
          }
        >
          <AdminTable
            rows={members}
            getKey={(member) => member.membership_id}
            empty="No members."
            minWidth={820}
            // Actions are full-width on a phone: two 11px buttons side by side in a
            // card is a mis-tap waiting to happen, and one of them disables an
            // account everywhere.
            renderCard={(member) => (
              <>
                <div className="border-b border-[var(--app-border-ui)] pb-3">
                  <p className="font-semibold text-[var(--app-text)]">{member.full_name}</p>
                  <p className="truncate text-[11px] text-[var(--app-text-faint)]">{member.email}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-[var(--app-surface-subtle)] px-2 py-0.5 text-[10px] font-bold text-[var(--app-text-muted)]">
                      {humanize(member.role)}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusClass(member.membership_status)}`}
                    >
                      Store: {humanize(member.membership_status)}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusClass(member.user_status)}`}
                    >
                      Account: {humanize(member.user_status)}
                    </span>
                  </div>
                </div>

                <p className="mt-3 text-[11px] text-[var(--app-text-faint)]">
                  Last seen {relative(member.last_login_at)}
                </p>

                <div className="mt-3 grid gap-2">
                  <MemberActions member={member} busy={busy} setPending={setPending} fullWidth />
                </div>
              </>
            )}
            columns={[
              {
                key: "person",
                header: "Person",
                cell: (member) => (
                  <>
                    <p className="font-semibold text-[var(--app-text)]">{member.full_name}</p>
                    <p className="text-[11px] text-[var(--app-text-faint)]">{member.email}</p>
                  </>
                ),
              },
              {
                key: "role",
                header: "Role",
                cell: (member) => (
                  <span className="text-[var(--app-text-muted)]">{humanize(member.role)}</span>
                ),
              },
              {
                key: "store",
                header: "This store",
                cell: (member) => (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusClass(member.membership_status)}`}
                  >
                    {humanize(member.membership_status)}
                  </span>
                ),
              },
              {
                key: "account",
                header: "Account",
                cell: (member) => (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusClass(member.user_status)}`}
                  >
                    {humanize(member.user_status)}
                  </span>
                ),
              },
              {
                key: "seen",
                header: "Last seen",
                cell: (member) => (
                  <span className="text-[var(--app-text-muted)]">
                    {relative(member.last_login_at)}
                  </span>
                ),
              },
              {
                key: "actions",
                header: "Actions",
                align: "right",
                cell: (member) => (
                  <div className="flex justify-end gap-2">
                    <MemberActions member={member} busy={busy} setPending={setPending} />
                  </div>
                ),
              },
            ]}
          />
        </AdminSection>
      ) : null}

      {tab === "invoices" ? (
        <AdminSection title="Invoices" subtitle="The 20 most recent subscription invoices">
          <AdminTable
            rows={invoices}
            getKey={(invoice) => invoice.id}
            empty="No invoices yet."
            minWidth={760}
            columns={[
              {
                key: "invoice",
                header: "Invoice",
                cell: (invoice) => (
                  <span className="break-all font-mono text-[11px] text-[var(--app-text-muted)]">
                    {invoice.identifier}
                  </span>
                ),
              },
              {
                key: "plan",
                header: "Plan",
                cell: (invoice) => (
                  <span className="text-[var(--app-text)]">
                    {humanize(invoice.plan_code)}{" "}
                    <span className="text-[11px] text-[var(--app-text-faint)]">
                      {humanize(invoice.interval)}
                    </span>
                  </span>
                ),
              },
              {
                key: "status",
                header: "Status",
                cell: (invoice) => (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusClass(invoice.status)}`}
                  >
                    {humanize(invoice.status)}
                  </span>
                ),
              },
              {
                key: "amount",
                header: "Amount",
                align: "right",
                cell: (invoice) => (
                  <span className="whitespace-nowrap tabular-nums font-semibold">
                    {invoice.currency} {Math.round(invoice.amount_cents / 100).toLocaleString()}
                  </span>
                ),
              },
              {
                key: "raised",
                header: "Raised",
                align: "right",
                cell: (invoice) => (
                  <span className="text-[var(--app-text-muted)]">{date(invoice.created_at)}</span>
                ),
              },
              {
                key: "paid",
                header: "Paid",
                align: "right",
                cell: (invoice) => (
                  <span className="text-[var(--app-text-muted)]">{date(invoice.paid_at)}</span>
                ),
              },
            ]}
          />
        </AdminSection>
      ) : null}

      {pending ? (
        <ConfirmModal
          title={confirmTitle(pending)}
          body={confirmBody(pending, profile.display_name)}
          confirmLabel={confirmLabel(pending)}
          busy={busy}
          onConfirm={() => void confirmPending()}
          onCancel={() => setPending(null)}
        />
      ) : null}
    </div>
  );
}

function confirmTitle(pending: NonNullable<PendingAction>): string {
  switch (pending.kind) {
    case "org_status":
      return `${humanize(pending.status)} this company?`;
    case "schedule_deletion":
      return "Schedule this company for deletion?";
    case "cancel_deletion":
      return "Cancel the scheduled deletion?";
    case "user_status":
      return pending.status === "disabled"
        ? "Disable this person's AuraStores account?"
        : "Re-enable this account?";
    case "membership_status":
      return pending.status === "suspended"
        ? "Suspend their access to this store?"
        : "Restore their access?";
  }
}

function confirmBody(pending: NonNullable<PendingAction>, companyName: string): React.ReactNode {
  switch (pending.kind) {
    case "org_status":
      if (pending.status === "suspended") {
        return (
          <p>
            Everyone at <strong>{companyName}</strong> will be locked out of the dashboard and the
            mobile app on their next request. Their data is not touched, and you can reactivate at any
            time.
          </p>
        );
      }
      if (pending.status === "archived") {
        return (
          <p>
            <strong>{companyName}</strong> will be locked out permanently, but every record is kept.
          </p>
        );
      }
      return (
        <p>
          Everyone at <strong>{companyName}</strong> gets their access back immediately.
        </p>
      );
    case "schedule_deletion":
      return (
        <p>
          <strong>{companyName}</strong> and <strong>all of its data</strong> — sales, stock, staff,
          invoices — will be permanently purged in 30 days. The store stays fully usable until then,
          and you can cancel at any point in that window. After the purge runs, none of it is
          recoverable.
        </p>
      );
    case "cancel_deletion":
      return (
        <p>
          <strong>{companyName}</strong> will no longer be purged. Nothing else changes.
        </p>
      );
    case "user_status":
      if (pending.status === "disabled") {
        // The single most dangerous confusion in this console — say it plainly.
        return (
          <p>
            <strong>{pending.member.full_name}</strong> will be locked out of{" "}
            <strong>every store they belong to on AuraStores</strong>, not just {companyName}. To
            revoke their access to this store only, use <strong>Suspend</strong> instead.
          </p>
        );
      }
      return (
        <p>
          <strong>{pending.member.full_name}</strong> will be able to sign in again, everywhere.
        </p>
      );
    case "membership_status":
      if (pending.status === "suspended") {
        return (
          <p>
            <strong>{pending.member.full_name}</strong> loses access to{" "}
            <strong>{companyName}</strong> only. They keep their account and any other stores.
          </p>
        );
      }
      return (
        <p>
          <strong>{pending.member.full_name}</strong> gets their access to {companyName} back.
        </p>
      );
  }
}

function confirmLabel(pending: NonNullable<PendingAction>): string {
  switch (pending.kind) {
    case "org_status":
      return humanize(pending.status);
    case "schedule_deletion":
      return "Schedule deletion";
    case "cancel_deletion":
      return "Cancel deletion";
    case "user_status":
      return pending.status === "disabled" ? "Disable everywhere" : "Re-enable";
    case "membership_status":
      return pending.status === "suspended" ? "Suspend" : "Restore";
  }
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--app-text-faint)]">
        {label}
      </p>
      <p className="mt-1 font-[family-name:var(--font-manrope)] text-xl font-extrabold text-[var(--app-text)]">
        {value}
      </p>
    </div>
  );
}

function DangerRow({
  title,
  body,
  action,
  tone,
  disabled,
  onClick,
}: {
  title: string;
  body: string;
  action: string;
  tone?: "safe";
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-input-bg)] p-4">
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-sm font-semibold text-[var(--app-text)]">{title}</p>
        <p className="text-xs text-[var(--app-text-muted)]">{body}</p>
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-60 ${
          tone === "safe" ? "bg-[var(--app-brand)]" : "bg-[#dc2626]"
        }`}
      >
        {action}
      </button>
    </div>
  );
}

function SmallButton({
  children,
  danger,
  disabled,
  fullWidth,
  onClick,
}: {
  children: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  /** Stacked, full-width, comfortably tappable — the mobile card layout. */
  fullWidth?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg border font-bold transition disabled:opacity-50 ${
        fullWidth
          ? "w-full px-3 py-2.5 text-xs"
          : "whitespace-nowrap px-2.5 py-1.5 text-[11px]"
      } ${
        danger
          ? "border-[#f2b8b5] text-[#7d2a2a] hover:bg-[#fdf3f3]"
          : "border-[var(--app-border-ui)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface-subtle)]"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * The per-person actions, shared by the desktop row and the mobile card so the two
 * can't drift — these buttons disable accounts, and a table showing "Suspend" where
 * the card shows "Disable everywhere" would be genuinely dangerous.
 */
function MemberActions({
  member,
  busy,
  setPending,
  fullWidth,
}: {
  member: AdminOrgMember;
  busy: boolean;
  setPending: (action: PendingAction) => void;
  fullWidth?: boolean;
}) {
  return (
    <>
      {member.membership_status === "suspended" ? (
        <SmallButton
          fullWidth={fullWidth}
          disabled={busy}
          onClick={() => setPending({ kind: "membership_status", member, status: "active" })}
        >
          Restore access to this store
        </SmallButton>
      ) : (
        <SmallButton
          fullWidth={fullWidth}
          disabled={busy}
          onClick={() => setPending({ kind: "membership_status", member, status: "suspended" })}
        >
          Suspend
        </SmallButton>
      )}
      {member.user_status === "disabled" ? (
        <SmallButton
          fullWidth={fullWidth}
          disabled={busy}
          onClick={() => setPending({ kind: "user_status", member, status: "active" })}
        >
          Re-enable account
        </SmallButton>
      ) : (
        <SmallButton
          danger
          fullWidth={fullWidth}
          disabled={busy}
          onClick={() => setPending({ kind: "user_status", member, status: "disabled" })}
        >
          Disable account
        </SmallButton>
      )}
    </>
  );
}
