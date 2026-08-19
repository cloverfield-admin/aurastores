"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  BillingIcon,
  BillingShell,
  BillingTopBar,
  C,
  Card,
  FONT_BODY,
  FONT_DISPLAY,
  FONT_MONO,
  GHOST_ON_DARK,
  MINT_BUTTON,
  MonoLabel,
  NoteBlock,
  Pill,
  RADIUS,
} from "@/components/billing/billing-chrome";
import {
  useBillingBranchCountQuery,
  useBillingInvoiceHistoryQuery,
  useBillingMeQuery,
  useSetCancelAtPeriodEndMutation,
  type BillingInvoice,
} from "@/lib/queries/web-billing";
import { usePublicPlansQuery } from "@/lib/queries/billing";
import {
  annualSaving,
  billingRoleLabel,
  BILLING_CURRENCY,
  canChangePlanTier,
  daysUntil,
  formatDate,
  formatDateShort,
  formatMoney,
  formatMoneyCompact,
  intervalLabel,
  intervalPerLabel,
  isBillingRole,
  maskTail,
} from "@/lib/billing/web-portal";

const GRID_2 = { display: "grid", gap: 20, alignItems: "start" } as const;

function Skeleton({ height, radius = RADIUS.card }: { height: number; radius?: number }) {
  return (
    <div
      style={{
        height,
        borderRadius: radius,
        background: "linear-gradient(90deg,#eef3f1,#f7faf9,#eef3f1)",
        backgroundSize: "200% 100%",
        animation: "auraBillingShimmer 1.4s ease-in-out infinite",
      }}
    />
  );
}

/**
 * Plan overview: what the organization is on, when it renews, where to upgrade,
 * and what has been paid.
 *
 * Every figure here comes from the engine — the plan, the period it runs to, and
 * the invoice list. Nothing is computed locally except the "in N days" hint and
 * the annual saving shown on the upgrade card, both of which are labels on top
 * of prices the engine quoted.
 */
export function BillingOverviewContent() {
  const router = useRouter();
  const me = useBillingMeQuery();
  const invoices = useBillingInvoiceHistoryQuery();
  const plans = usePublicPlansQuery(BILLING_CURRENCY);

  const role = isBillingRole(me.data?.role) ? me.data.role : null;
  const branchCount = useBillingBranchCountQuery(Boolean(me.data));

  const subscription = me.data?.subscription ?? null;
  const orgName = me.data?.organization.name ?? null;

  const proPlan = useMemo(
    () => plans.data?.plans.find((plan) => plan.code === "pro") ?? null,
    [plans.data],
  );

  const currentPlanPriceCents = useMemo(() => {
    if (!subscription) return null;
    const plan = plans.data?.plans.find((p) => p.code === subscription.plan_code);
    return plan?.prices[subscription.interval]?.amountCents ?? null;
  }, [plans.data, subscription]);

  const saving = annualSaving(
    proPlan?.prices.monthly?.amountCents,
    proPlan?.prices.yearly?.amountCents,
  );

  const periodEnd = subscription?.current_period_end ?? null;
  const renewsOn = formatDate(periodEnd);
  const renewsIn = daysUntil(periodEnd);
  const isActive = subscription?.status === "active" || subscription?.status === "trialing";
  // A pending cancellation is not "expired": the store keeps everything it paid
  // for until the period lapses, so it reads as ENDING rather than gone.
  const endingAtPeriodEnd = Boolean(subscription?.cancel_at_period_end) && isActive;
  const canCancel = Boolean(role && canChangePlanTier(role)) && isActive;

  const setCancel = useSetCancelAtPeriodEndMutation();
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const lastPaid = useMemo(
    () => (invoices.data ?? []).find((invoice) => invoice.status === "paid") ?? null,
    [invoices.data],
  );

  const branchLine = [orgName, branchCount.data ? `${branchCount.data} branches` : null]
    .filter(Boolean)
    .join(" · ");

  function goToCheckout(params: { plan: string; interval: string }) {
    router.push(`/billing/checkout?plan=${params.plan}&interval=${params.interval}`);
  }

  return (
    <BillingShell>
      <style>{`@keyframes auraBillingShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @media (max-width: 900px){.aura-billing-grid{grid-template-columns:1fr !important}
        .aura-billing-history{overflow-x:auto}}`}</style>

      <BillingTopBar
        roleLabel={role ? billingRoleLabel(role) : null}
        userName={me.data?.user.full_name ?? me.data?.user.email ?? null}
      />

      <main style={{ maxWidth: 1080, margin: "0 auto", padding: "36px 32px 48px" }}>
        {me.isError ? (
          <Card>
            <p style={{ margin: 0, fontSize: 14, color: C.secondary }}>
              We couldn&apos;t load your plan just now. Refresh the page to try again.
            </p>
          </Card>
        ) : null}

        <div className="aura-billing-grid" style={{ ...GRID_2, gridTemplateColumns: "1.25fr 1fr" }}>
          {/* ── Current plan ─────────────────────────────────────────── */}
          <div
            style={{
              background: C.dark,
              borderRadius: RADIUS.card,
              padding: 28,
              color: "#fff",
              position: "relative",
              overflow: "hidden",
              minHeight: 244,
            }}
          >
            <div
              aria-hidden
              style={{
                position: "absolute",
                top: -120,
                right: -80,
                width: 300,
                height: 300,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(169,227,214,0.16), transparent 65%)",
              }}
            />
            {me.isPending ? (
              <div style={{ position: "relative", opacity: 0.5 }}>
                <MonoLabel color={C.mintText}>LOADING YOUR PLAN…</MonoLabel>
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    position: "relative",
                    flexWrap: "wrap",
                  }}
                >
                  <MonoLabel color={C.mintText}>
                    CURRENT PLAN{branchLine ? ` · ${branchLine.toUpperCase()}` : ""}
                  </MonoLabel>
                  <Pill
                    background={endingAtPeriodEnd ? C.warnBg : isActive ? C.mint : "#f3d9d6"}
                    color={endingAtPeriodEnd ? C.warn : isActive ? C.dark : "#7d2b25"}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: endingAtPeriodEnd ? C.warn : isActive ? C.dark : "#7d2b25",
                      }}
                    />
                    {endingAtPeriodEnd
                      ? `ENDING ${formatDateShort(periodEnd)?.toUpperCase() ?? ""}`.trim()
                      : isActive
                        ? "ACTIVE"
                        : "EXPIRED"}
                  </Pill>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 12,
                    marginTop: 16,
                    position: "relative",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontFamily: FONT_DISPLAY,
                      fontWeight: 800,
                      fontSize: 38,
                      letterSpacing: "-0.03em",
                    }}
                  >
                    {subscription?.plan_name ?? "No plan"}
                  </span>
                  {currentPlanPriceCents != null && subscription ? (
                    <span style={{ fontFamily: FONT_MONO, fontSize: 13, color: C.mintText }}>
                      {formatMoneyCompact(currentPlanPriceCents)}{" "}
                      {intervalPerLabel(subscription.interval)}
                    </span>
                  ) : null}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    marginTop: 18,
                    position: "relative",
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      minWidth: 180,
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 13,
                      padding: 14,
                    }}
                  >
                    <MonoLabel color={C.mintText} size={9.5}>
                      RENEWS
                    </MonoLabel>
                    <div
                      style={{
                        fontFamily: FONT_DISPLAY,
                        fontWeight: 700,
                        fontSize: 17,
                        marginTop: 6,
                      }}
                    >
                      {renewsOn ?? "—"}
                    </div>
                    <div style={{ fontSize: 11.5, color: "#bcd6cf", marginTop: 3 }}>
                      {renewsIn == null
                        ? "No renewal date on file"
                        : renewsIn === 0
                          ? "today"
                          : `in ${renewsIn} day${renewsIn === 1 ? "" : "s"}`}
                    </div>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      minWidth: 180,
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 13,
                      padding: 14,
                    }}
                  >
                    <MonoLabel color={C.mintText} size={9.5}>
                      LAST PAYMENT
                    </MonoLabel>
                    <div
                      style={{
                        fontFamily: FONT_DISPLAY,
                        fontWeight: 700,
                        fontSize: 17,
                        marginTop: 6,
                      }}
                    >
                      {lastPaid ? formatMoney(lastPaid.amount_cents, lastPaid.currency) : "—"}
                    </div>
                    <div style={{ fontSize: 11.5, color: "#bcd6cf", marginTop: 3 }}>
                      {lastPaid
                        ? [intervalLabel(lastPaid.interval), formatDateShort(lastPaid.paid_at)]
                            .filter(Boolean)
                            .join(" · ")
                        : "No payments yet"}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    marginTop: 22,
                    position: "relative",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      goToCheckout({
                        plan: subscription?.plan_code ?? "pro",
                        interval: subscription?.interval ?? "monthly",
                      })
                    }
                    style={MINT_BUTTON}
                  >
                    <BillingIcon name="autorenew" size={18} />
                    Renew now
                  </button>
                  {saving && subscription?.interval !== "yearly" ? (
                    <button
                      type="button"
                      onClick={() => goToCheckout({ plan: "pro", interval: "yearly" })}
                      style={GHOST_ON_DARK}
                    >
                      Switch to annual · save {saving.monthsFree} months
                    </button>
                  ) : null}
                </div>

                {endingAtPeriodEnd ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      flexWrap: "wrap",
                      marginTop: 18,
                      position: "relative",
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: RADIUS.control,
                      padding: 14,
                    }}
                  >
                    <BillingIcon name="event_busy" size={18} color={C.mintText} />
                    <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: "#bcd6cf", flex: 1 }}>
                      Your plan ends on {renewsOn ?? "your renewal date"} and this organization
                      moves to Free. Nothing changes before then.
                    </p>
                    {canCancel ? (
                      <button
                        type="button"
                        onClick={() => setCancel.mutate(false)}
                        disabled={setCancel.isPending}
                        style={{ ...MINT_BUTTON, opacity: setCancel.isPending ? 0.6 : 1 }}
                      >
                        <BillingIcon name="undo" size={18} />
                        {setCancel.isPending ? "Resuming…" : "Resume subscription"}
                      </button>
                    ) : null}
                  </div>
                ) : canCancel ? (
                  <div style={{ marginTop: 18, position: "relative" }}>
                    {confirmingCancel ? (
                      <div
                        style={{
                          background: "rgba(255,255,255,0.07)",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: RADIUS.control,
                          padding: 14,
                        }}
                      >
                        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: "#e6f2ef" }}>
                          You keep {subscription?.plan_name ?? "your plan"} until{" "}
                          <strong>{renewsOn ?? "your renewal date"}</strong>, then this
                          organization moves to Free across every branch. You can undo this any
                          time before then.
                        </p>
                        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            onClick={() =>
                              setCancel.mutate(true, { onSuccess: () => setConfirmingCancel(false) })
                            }
                            disabled={setCancel.isPending}
                            style={{ ...GHOST_ON_DARK, opacity: setCancel.isPending ? 0.6 : 1 }}
                          >
                            {setCancel.isPending ? "Cancelling…" : "Yes, cancel at period end"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingCancel(false)}
                            style={{ ...MINT_BUTTON }}
                          >
                            Keep my plan
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmingCancel(true)}
                        style={{
                          border: "none",
                          background: "transparent",
                          padding: 0,
                          fontFamily: FONT_BODY,
                          fontSize: 12.5,
                          fontWeight: 600,
                          color: "#bcd6cf",
                          textDecoration: "underline",
                          textUnderlineOffset: 3,
                          cursor: "pointer",
                        }}
                      >
                        Cancel subscription
                      </button>
                    )}
                  </div>
                ) : null}

                {setCancel.isError ? (
                  <p
                    role="alert"
                    style={{
                      margin: "12px 0 0",
                      position: "relative",
                      fontSize: 12.5,
                      color: "#ffd9d4",
                    }}
                  >
                    {setCancel.error instanceof Error
                      ? setCancel.error.message
                      : "That didn't go through. Try again in a moment."}
                  </p>
                ) : null}
              </>
            )}
          </div>

          {/* ── Upgrade ──────────────────────────────────────────────── */}
          <Card>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 16 }}>
                Upgrade your plan
              </span>
              <BillingIcon name="upgrade" size={19} color={C.placeholder} />
            </div>

            <div
              style={{
                border: `1px solid ${C.borderInput}`,
                borderRadius: 14,
                padding: 16,
                marginTop: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 14.5 }}>
                  Pro · Annual
                </div>
                <div style={{ fontSize: 12.5, color: C.muted, marginTop: 3 }}>
                  {proPlan?.prices.yearly
                    ? `${formatMoneyCompact(proPlan.prices.yearly.amountCents)} /year`
                    : "Annual pricing"}
                  {saving ? ` · ${saving.monthsFree} months free` : ""}
                </div>
              </div>
              {role && canChangePlanTier(role) ? (
                <button
                  type="button"
                  onClick={() => goToCheckout({ plan: "pro", interval: "yearly" })}
                  style={{
                    border: "none",
                    background: "transparent",
                    fontFamily: FONT_BODY,
                    fontSize: 13,
                    fontWeight: 600,
                    color: C.primary,
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                  }}
                >
                  Choose →
                </button>
              ) : (
                <span
                  title="Only Store Owners can change the plan tier"
                  style={{ fontSize: 12.5, fontWeight: 600, color: C.placeholder }}
                >
                  Owner only
                </span>
              )}
            </div>

            <div
              style={{
                border: `1px solid ${C.borderFaint}`,
                background: "#fafcfb",
                borderRadius: 14,
                padding: 16,
                marginTop: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span
                    style={{
                      fontFamily: FONT_DISPLAY,
                      fontWeight: 700,
                      fontSize: 14.5,
                      color: C.muted,
                    }}
                  >
                    Enterprise
                  </span>
                  <Pill background={C.warnBg} color={C.warn} style={{ letterSpacing: "0.08em" }}>
                    COMING SOON
                  </Pill>
                </div>
                <div style={{ fontSize: 12.5, color: C.faint, marginTop: 3 }}>
                  Unlimited branches &amp; Aura Pay reconciliation
                </div>
              </div>
              <a
                href="mailto:sales@aurastores.app?subject=AuraStores%20Enterprise"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: C.placeholder,
                  whiteSpace: "nowrap",
                  textDecoration: "none",
                }}
              >
                Contact sales
              </a>
            </div>

            <div style={{ marginTop: 16 }}>
              <NoteBlock icon="info" background={C.tint}>
                Plan changes apply to your whole organization, across all branches, immediately
                after payment.
              </NoteBlock>
            </div>
          </Card>
        </div>

        {/* ── Payment history ────────────────────────────────────────── */}
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: RADIUS.card,
            marginTop: 20,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "18px 24px",
              borderBottom: `1px solid ${C.borderFaint}`,
            }}
          >
            <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 16 }}>
              Payment history
            </span>
          </div>

          <div className="aura-billing-history">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 1fr 1.2fr 0.8fr",
                gap: 12,
                padding: "12px 24px",
                borderBottom: `1px solid ${C.borderFaint}`,
                minWidth: 640,
              }}
            >
              <MonoLabel size={10} style={{ letterSpacing: "0.1em" }}>DATE</MonoLabel>
              <MonoLabel size={10} style={{ letterSpacing: "0.1em" }}>PLAN</MonoLabel>
              <MonoLabel size={10} style={{ letterSpacing: "0.1em" }}>REFERENCE</MonoLabel>
              <MonoLabel size={10} style={{ letterSpacing: "0.1em" }}>AMOUNT</MonoLabel>
            </div>

            {invoices.isPending ? (
              <div style={{ padding: 24 }}>
                <Skeleton height={54} radius={12} />
              </div>
            ) : (invoices.data ?? []).length === 0 ? (
              <p style={{ padding: "22px 24px", margin: 0, fontSize: 13.5, color: C.muted }}>
                No payments yet. Your first renewal will show up here.
              </p>
            ) : (
              (invoices.data ?? []).map((invoice, index, all) => (
                <HistoryRow key={invoice.id} invoice={invoice} last={index === all.length - 1} />
              ))
            )}
          </div>
        </div>
      </main>
    </BillingShell>
  );
}

function HistoryRow({ invoice, last }: { invoice: BillingInvoice; last: boolean }) {
  const paid = invoice.status === "paid";
  const date = formatDate(invoice.paid_at ?? invoice.created_at);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1.2fr 1fr 1.2fr 0.8fr",
        gap: 12,
        padding: "15px 24px",
        borderBottom: last ? "none" : `1px solid ${C.surfaceMuted}`,
        alignItems: "center",
        fontSize: 13.5,
        minWidth: 640,
      }}
    >
      <span>{date ?? "—"}</span>
      <span>
        {invoice.plan_name} · {intervalLabel(invoice.interval)}
      </span>
      <span
        style={{ display: "inline-flex", alignItems: "center", gap: 7, color: paid ? C.text : C.muted }}
      >
        {paid ? null : (
          <Pill
            background={invoice.status === "pending" ? C.warnBg : "#fdf1f0"}
            color={invoice.status === "pending" ? C.warn : "#7d2b25"}
          >
            {invoice.status.toUpperCase()}
          </Pill>
        )}
        <span style={{ fontFamily: FONT_MONO, fontSize: 12 }}>
          {maskTail(invoice.identifier) ?? invoice.identifier.slice(0, 12)}
        </span>
      </span>
      <span style={{ fontWeight: 600 }}>{formatMoney(invoice.amount_cents, invoice.currency)}</span>
    </div>
  );
}
