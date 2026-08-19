"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  BARE_INPUT,
  BillingIcon,
  BillingShell,
  BillingTopBar,
  C,
  Card,
  FIELD_LABEL,
  FONT_BODY,
  FONT_DISPLAY,
  FONT_MONO,
  INPUT_WRAP,
  MonoLabel,
  NoteBlock,
  PRIMARY_BUTTON,
  RADIUS,
} from "@/components/billing/billing-chrome";
import { EngineApiError } from "@/lib/api/engine";
import { useBillingMeQuery } from "@/lib/queries/web-billing";
import {
  usePublicPlansQuery,
  type SubscriptionInterval,
  type SubscriptionPlanCode,
} from "@/lib/queries/billing";
import {
  useEngineInvoiceQuery,
  useStartLencoCheckoutMutation,
} from "@/lib/queries/subscription";
import {
  annualSaving,
  billingRoleLabel,
  BILLING_CURRENCY,
  canChangePlanTier,
  formatDate,
  formatMoneyCompact,
  formatMsisdnInput,
  intervalLabel,
  isBillingRole,
  MOMO_NETWORKS,
  networkForMsisdn,
  networkLabel,
  normalizeZambianMsisdn,
  type MomoNetwork,
} from "@/lib/billing/web-portal";

const VALID_INTERVALS: SubscriptionInterval[] = ["monthly", "quarterly", "yearly"];
const VALID_PLANS: SubscriptionPlanCode[] = ["basic", "pro"];

/**
 * The provider that actually takes the money. The engine owns the integration —
 * this is the trust line's label only, so a swap there is a one-word change here.
 */
const PROVIDER_NAME = "Lenco";

type Phase = "form" | "awaiting" | "success" | "failed";

/**
 * Checkout.
 *
 * The client starts a Lenco collection and then does nothing but watch: the
 * customer approves the prompt on their handset, Lenco calls the engine's
 * webhook, and the engine activates the plan. The only honest signal that the
 * money landed is the invoice flipping to `paid`, so that is what this polls.
 * Amounts, the period a payment buys, and activation are all server-side.
 */
export function BillingCheckoutContent() {
  const params = useSearchParams();
  const me = useBillingMeQuery();
  const plans = usePublicPlansQuery(BILLING_CURRENCY);
  const startCheckout = useStartLencoCheckoutMutation();

  const requestedPlan = params.get("plan");
  const requestedInterval = params.get("interval");

  const subscription = me.data?.subscription ?? null;
  const role = isBillingRole(me.data?.role) ? me.data.role : null;

  const planCode: SubscriptionPlanCode = VALID_PLANS.includes(
    requestedPlan as SubscriptionPlanCode,
  )
    ? (requestedPlan as SubscriptionPlanCode)
    : (subscription?.plan_code ?? "pro");

  const interval: SubscriptionInterval = VALID_INTERVALS.includes(
    requestedInterval as SubscriptionInterval,
  )
    ? (requestedInterval as SubscriptionInterval)
    : (subscription?.interval ?? "yearly");

  const plan = useMemo(
    () => plans.data?.plans.find((p) => p.code === planCode) ?? null,
    [plans.data, planCode],
  );

  const priceCents = plan?.prices[interval]?.amountCents ?? null;
  const monthlyCents = plan?.prices.monthly?.amountCents;
  const saving = interval === "yearly" ? annualSaving(monthlyCents, priceCents ?? undefined) : null;
  const listCents = saving && priceCents != null ? priceCents + saving.amountCents : priceCents;

  const isTierChange = Boolean(subscription) && planCode !== subscription?.plan_code;
  const mayProceed = role ? (isTierChange ? canChangePlanTier(role) : true) : false;

  const [method, setMethod] = useState<"momo" | "card">("momo");
  const [network, setNetwork] = useState<MomoNetwork>("mtn");
  const [phone, setPhone] = useState("");
  const [tierConfirmed, setTierConfirmed] = useState(false);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  /**
   * The phase is derived from the invoice rather than mirrored into state.
   *
   * The webhook is what settles a collection, so the invoice's status is the
   * only real signal — copying it into a `phase` via an effect would just be a
   * second, laggier source of the same truth (and a cascading render).
   */
  const settlement = useEngineInvoiceQuery(invoiceId, submitted);
  const settledStatus = settlement.data?.status;
  const phase: Phase = !submitted
    ? startError
      ? "failed"
      : "form"
    : settledStatus === "paid"
      ? "success"
      : settledStatus === "failed" || settledStatus === "expired"
        ? "failed"
        : "awaiting";

  const error =
    startError ??
    (settledStatus === "expired"
      ? "The payment prompt expired before it was approved."
      : settledStatus === "failed"
        ? "The payment was not completed. No money has left your account."
        : null);

  const msisdn = normalizeZambianMsisdn(phone);
  // The engine derives the operator from the number, so a mismatch would not
  // misroute the collection — but it almost always means a typo, and it is
  // cheaper to catch here than after a prompt goes to the wrong handset.
  const detectedNetwork = networkForMsisdn(msisdn);
  const networkMismatch = Boolean(detectedNetwork) && detectedNetwork !== network;
  const blockedReason = !role
    ? null
    : isTierChange && !canChangePlanTier(role)
      ? "Only a Store Owner can move the organization to a different plan. You can still renew the current plan."
      : null;

  const canSubmit =
    mayProceed &&
    method === "momo" &&
    Boolean(msisdn) &&
    !networkMismatch &&
    (!isTierChange || tierConfirmed) &&
    phase === "form" &&
    !startCheckout.isPending;

  async function handlePay() {
    if (!msisdn) {
      setStartError("Enter the mobile money number as 09X XXX XXXX.");
      return;
    }
    setStartError(null);
    try {
      const result = await startCheckout.mutateAsync({
        plan_code: planCode,
        interval,
        phone: msisdn,
      });
      if (result.status === "failed") {
        setStartError(result.message || "The payment could not be started.");
        return;
      }
      setInvoiceId(result.invoice_id);
      setSubmitted(true);
    } catch (submitError) {
      setStartError(
        submitError instanceof EngineApiError
          ? submitError.message
          : "We couldn't start the payment. Try again in a moment.",
      );
    }
  }

  /**
   * The coverage line, for the summary only: a renewal extends from the current
   * expiry rather than the payment date. The engine sets the real period when
   * the webhook activates the plan — this is a label, not a promise.
   *
   * Built with Date.UTC rather than mutating a Date so the value stays a pure
   * computation (month overflow rolls the year on its own).
   */
  const coverageStart = subscription?.current_period_end ?? null;
  const coverageEnd = useMemo(() => {
    if (!coverageStart) return null;
    const start = new Date(coverageStart);
    if (Number.isNaN(start.getTime())) return null;
    const months = interval === "monthly" ? 1 : interval === "quarterly" ? 3 : 12;
    return new Date(
      Date.UTC(
        start.getUTCFullYear(),
        start.getUTCMonth() + months,
        start.getUTCDate(),
        start.getUTCHours(),
        start.getUTCMinutes(),
        start.getUTCSeconds(),
      ),
    ).toISOString();
  }, [coverageStart, interval]);

  return (
    <BillingShell>
      <style>{`@media (max-width: 900px){.aura-checkout-grid{grid-template-columns:1fr !important}
        .aura-checkout-summary{position:static !important}}`}</style>

      <BillingTopBar
        roleLabel={role ? billingRoleLabel(role) : null}
        userName={me.data?.user.full_name ?? me.data?.user.email ?? null}
      />

      <main style={{ maxWidth: 920, margin: "0 auto", padding: "36px 24px 56px" }}>
        <nav
          aria-label="Breadcrumb"
          style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.faint }}
        >
          <Link href="/billing" style={{ color: C.faint, textDecoration: "none" }}>
            Billing
          </Link>
          <BillingIcon name="chevron_right" size={15} />
          <span style={{ fontWeight: 600, color: C.text }}>
            {isTierChange ? "Upgrade" : "Renew"} {plan?.name ?? planCode} ·{" "}
            {intervalLabel(interval)}
          </span>
        </nav>

        {phase === "success" ? (
          <SuccessPanel
            planName={plan?.name ?? planCode}
            interval={interval}
            amountCents={settlement.data?.amount_cents ?? priceCents ?? 0}
            coverageEnd={coverageEnd}
          />
        ) : (
          <div
            className="aura-checkout-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 380px",
              gap: 20,
              marginTop: 20,
              alignItems: "start",
            }}
          >
            {/* ── Payment method ─────────────────────────────────────── */}
            <Card padding={28}>
              <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 18 }}>
                How would you like to pay?
              </span>

              <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
                <MethodTile
                  selected={method === "momo"}
                  icon="send_to_mobile"
                  title="Mobile money"
                  subtitle="MTN · Airtel · Zamtel"
                  onSelect={() => setMethod("momo")}
                />
                <MethodTile
                  selected={method === "card"}
                  icon="credit_card"
                  title="Card"
                  subtitle="Visa · Mastercard"
                  onSelect={() => setMethod("card")}
                />
              </div>

              {method === "momo" ? (
                <>
                  <label style={{ ...FIELD_LABEL, marginTop: 24 }}>Network</label>
                  <div style={{ display: "flex", gap: 9, marginTop: 9, flexWrap: "wrap" }}>
                    {MOMO_NETWORKS.map((option) => {
                      const selected = network === option.key;
                      return (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => setNetwork(option.key)}
                          aria-pressed={selected}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            border: selected
                              ? `2px solid ${C.primary}`
                              : `1px solid ${C.borderInput}`,
                            background: selected ? "#f2faf8" : C.surface,
                            borderRadius: RADIUS.pill,
                            padding: selected ? "8px 15px" : "9px 16px",
                            fontFamily: FONT_BODY,
                            fontSize: 13.5,
                            fontWeight: selected ? 700 : 600,
                            color: selected ? C.text : C.secondary,
                            cursor: "pointer",
                          }}
                        >
                          <span
                            style={{
                              width: 9,
                              height: 9,
                              borderRadius: "50%",
                              background: option.dot,
                            }}
                          />
                          {option.label}
                        </button>
                      );
                    })}
                  </div>

                  <label htmlFor="momo-number" style={{ ...FIELD_LABEL, marginTop: 22 }}>
                    Mobile money number
                  </label>
                  <div style={INPUT_WRAP}>
                    <span style={{ fontSize: 14.5, fontWeight: 600 }}>🇿🇲 +260</span>
                    <span style={{ width: 1, height: 22, background: C.border }} />
                    <input
                      id="momo-number"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      placeholder="97 784 2210"
                      value={formatMsisdnInput(phone)}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={phase !== "form"}
                      style={BARE_INPUT}
                    />
                    <MonoLabel
                      color={C.success}
                      size={10.5}
                      style={{
                        background: C.tint,
                        borderRadius: RADIUS.pill,
                        padding: "4px 10px",
                        letterSpacing: "0.08em",
                      }}
                    >
                      ACCOUNT NUMBER
                    </MonoLabel>
                  </div>

                  {networkMismatch && detectedNetwork ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginTop: 10,
                        fontSize: 12.5,
                        color: C.warn,
                      }}
                    >
                      <BillingIcon name="info" size={16} color={C.warn} />
                      <span>
                        That looks like a {networkLabel(detectedNetwork)} number.{" "}
                        <button
                          type="button"
                          onClick={() => setNetwork(detectedNetwork)}
                          style={{
                            border: "none",
                            background: "transparent",
                            padding: 0,
                            font: "inherit",
                            fontWeight: 700,
                            color: C.primary,
                            cursor: "pointer",
                          }}
                        >
                          Switch to {networkLabel(detectedNetwork)}
                        </button>
                      </span>
                    </div>
                  ) : null}

                  <div style={{ marginTop: 18 }}>
                    <NoteBlock icon="notifications_active">
                      We&apos;ll send a payment prompt to this phone. Approve it with your mobile
                      money PIN to complete the {isTierChange ? "upgrade" : "renewal"} — this page
                      updates automatically.
                    </NoteBlock>
                  </div>
                </>
              ) : (
                <div style={{ marginTop: 22 }}>
                  <NoteBlock icon="info">
                    Card payments aren&apos;t enabled on the web portal yet — the subscription rail
                    behind this page collects by mobile money. Pick{" "}
                    <strong style={{ color: "#2f4540" }}>Mobile money</strong> to pay now.
                  </NoteBlock>
                </div>
              )}

              {blockedReason ? (
                <div style={{ marginTop: 18 }}>
                  <NoteBlock icon="lock" background="#fdf6f0">
                    {blockedReason}
                  </NoteBlock>
                </div>
              ) : null}

              {isTierChange && mayProceed ? (
                <label
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                    marginTop: 18,
                    background: C.tint,
                    borderRadius: RADIUS.control,
                    padding: 13,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={tierConfirmed}
                    onChange={(e) => setTierConfirmed(e.target.checked)}
                    style={{ marginTop: 2, accentColor: C.primary }}
                  />
                  <span style={{ fontSize: 12.5, lineHeight: 1.5, color: C.secondary }}>
                    I understand this moves{" "}
                    <strong style={{ color: "#2f4540" }}>
                      {me.data?.organization.name ?? "my organization"}
                    </strong>{" "}
                    to {plan?.name ?? planCode} · {intervalLabel(interval)} for every branch,
                    effective as soon as the payment clears.
                  </span>
                </label>
              ) : null}
            </Card>

            {/* ── Order summary ──────────────────────────────────────── */}
            <div className="aura-checkout-summary" style={{ position: "sticky", top: 20 }}>
              <Card padding={26}>
                <MonoLabel>ORDER SUMMARY</MonoLabel>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    marginTop: 16,
                  }}
                >
                  <div>
                    <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 15.5 }}>
                      {plan?.name ?? planCode} · {intervalLabel(interval)}
                    </div>
                    <div style={{ fontSize: 12.5, color: C.muted, marginTop: 3 }}>
                      {me.data?.organization.name ?? "Your organization"} · all branches
                    </div>
                  </div>
                  <span style={{ fontSize: 14.5, fontWeight: 600 }}>
                    {listCents != null ? formatMoneyCompact(listCents) : "—"}
                  </span>
                </div>

                {saving ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      marginTop: 12,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13.5,
                        color: C.success,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <BillingIcon name="redeem" size={16} color={C.success} />
                      Annual discount · {saving.monthsFree} months free
                    </span>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: C.success }}>
                      − {formatMoneyCompact(saving.amountCents)}
                    </span>
                  </div>
                ) : null}

                <div style={{ height: 1, background: C.borderFaint, margin: "16px 0" }} />

                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Due today</span>
                  <span
                    style={{
                      fontFamily: FONT_DISPLAY,
                      fontWeight: 800,
                      fontSize: 26,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {priceCents != null ? formatMoneyCompact(priceCents) : "—"}
                  </span>
                </div>

                {coverageStart && coverageEnd ? (
                  <div style={{ fontSize: 12, color: C.faint, marginTop: 6 }}>
                    Covers {formatDate(coverageStart)} → {formatDate(coverageEnd)} · all branches
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: C.faint, marginTop: 6 }}>
                    Renewal extends from your current expiry date.
                  </div>
                )}

                {error ? (
                  <p
                    role="alert"
                    style={{ fontSize: 12.5, color: "#7d2b25", margin: "14px 0 0", lineHeight: 1.5 }}
                  >
                    {error}
                  </p>
                ) : null}

                {phase === "awaiting" ? (
                  <AwaitingPanel />
                ) : (
                  <button
                    type="button"
                    onClick={handlePay}
                    disabled={!canSubmit}
                    style={{
                      ...PRIMARY_BUTTON,
                      marginTop: 20,
                      opacity: canSubmit ? 1 : 0.5,
                      cursor: canSubmit ? "pointer" : "not-allowed",
                    }}
                  >
                    <BillingIcon name="lock" size={19} color={C.mint} />
                    {startCheckout.isPending
                      ? "Starting payment…"
                      : `Pay ${priceCents != null ? formatMoneyCompact(priceCents) : ""}`}
                  </button>
                )}

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 7,
                    marginTop: 16,
                  }}
                >
                  <BillingIcon name="verified_user" size={15} color={C.faint} />
                  <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.faint }}>
                    Secured &amp; processed by{" "}
                    <strong style={{ color: "#2f4540" }}>{PROVIDER_NAME}</strong>
                  </span>
                </div>
              </Card>
            </div>
          </div>
        )}
      </main>
    </BillingShell>
  );
}

function MethodTile({
  selected,
  icon,
  title,
  subtitle,
  onSelect,
}: {
  selected: boolean;
  icon: string;
  title: string;
  subtitle: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      style={{
        flex: 1,
        minWidth: 180,
        textAlign: "left",
        border: selected ? `2px solid ${C.primary}` : `1px solid ${C.borderInput}`,
        background: selected ? "#f2faf8" : C.surface,
        borderRadius: 14,
        padding: selected ? 15 : 16,
        cursor: "pointer",
        position: "relative",
        fontFamily: FONT_BODY,
      }}
    >
      <BillingIcon name={icon} size={22} color={selected ? C.primary : C.muted} />
      <div
        style={{
          fontSize: 14.5,
          fontWeight: 700,
          marginTop: 8,
          color: selected ? C.text : C.secondary,
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 12, color: selected ? C.muted : C.faint, marginTop: 2 }}>
        {subtitle}
      </div>
      {selected ? (
        <BillingIcon
          name="check_circle"
          size={19}
          color={C.primary}
          style={{ position: "absolute", top: 12, right: 12 }}
        />
      ) : null}
    </button>
  );
}

function AwaitingPanel() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        background: C.tint,
        borderRadius: RADIUS.control,
        padding: 14,
        marginTop: 20,
      }}
    >
      <BillingIcon name="hourglass_top" size={19} color={C.primary} style={{ flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 700 }}>Waiting for your approval</div>
        <p style={{ fontSize: 12.5, lineHeight: 1.5, color: C.muted, margin: "4px 0 0" }}>
          Check your phone and approve the prompt with your mobile money PIN. Keep this page open —
          it updates on its own.
        </p>
      </div>
    </div>
  );
}

function SuccessPanel({
  planName,
  interval,
  amountCents,
  coverageEnd,
}: {
  planName: string;
  interval: SubscriptionInterval;
  amountCents: number;
  coverageEnd: string | null;
}) {
  return (
    <Card padding={32} style={{ marginTop: 20, textAlign: "center" }}>
      <span
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: C.tint,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <BillingIcon name="check_circle" size={30} color={C.success} />
      </span>
      <h1
        style={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 700,
          fontSize: 24,
          letterSpacing: "-0.02em",
          margin: "18px 0 0",
        }}
      >
        Payment received
      </h1>
      <p
        style={{
          fontSize: 14.5,
          lineHeight: 1.55,
          color: C.secondary,
          margin: "10px auto 0",
          maxWidth: 420,
        }}
      >
        {planName} · {intervalLabel(interval)} is active across every branch.
        {coverageEnd ? ` Your plan now runs to ${formatDate(coverageEnd)}.` : ""}
      </p>
      <div
        style={{
          display: "inline-flex",
          gap: 10,
          alignItems: "center",
          marginTop: 18,
          background: C.surfaceMuted,
          borderRadius: RADIUS.pill,
          padding: "8px 16px",
        }}
      >
        <MonoLabel>PAID</MonoLabel>
        <strong style={{ fontSize: 14 }}>{formatMoneyCompact(amountCents)}</strong>
      </div>
      <div style={{ marginTop: 24 }}>
        <Link
          href="/billing"
          style={{
            ...PRIMARY_BUTTON,
            width: "auto",
            padding: "0 26px",
            textDecoration: "none",
            display: "inline-flex",
          }}
        >
          Back to billing
        </Link>
      </div>
      <p style={{ fontSize: 12, color: C.faint, marginTop: 14 }}>
        A receipt for this payment is listed in your payment history.
      </p>
    </Card>
  );
}
