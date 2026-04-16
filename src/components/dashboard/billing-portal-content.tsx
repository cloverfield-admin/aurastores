"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ROUTES } from "@/lib/routes";
import { useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api/client";
import { apiUrl } from "@/lib/api/version";
import {
  useCheckLipilaCollectionStatusMutation,
  useBillingInvoicesQuery,
  useBillingMeQuery,
  useCreateInvoiceMutation,
  usePublicPlansQuery,
  useStartLipilaCardCollectionMutation,
  useStartLipilaMomoCollectionMutation,
  useStartLipilaPaymentMutation,
  billingInvoicesQueryKey,
  billingMeQueryKey,
  type InvoiceRow,
  type SubscriptionInterval,
  type SubscriptionPlanCode,
} from "@/lib/queries/billing";

function formatMoney(currency: string, amountCents: number) {
  const value = (amountCents / 100).toFixed(2).replace(/\.00$/, "");
  return `${currency} ${value}`;
}

function formatWhen(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusBadge(status: InvoiceRow["status"]) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]";
  switch (status) {
    case "paid":
      return <span className={`${base} bg-[rgba(16,185,129,0.12)] text-[#065f46]`}>Paid</span>;
    case "pending":
      return <span className={`${base} bg-[rgba(99,102,241,0.12)] text-[#3730a3]`}>Pending</span>;
    case "failed":
      return <span className={`${base} bg-[rgba(239,68,68,0.12)] text-[#7f1d1d]`}>Failed</span>;
    case "expired":
      return <span className={`${base} bg-[rgba(100,116,139,0.14)] text-[#334155]`}>Expired</span>;
    default:
      return <span className={`${base} bg-[rgba(100,116,139,0.14)] text-[#334155]`}>{status}</span>;
  }
}

function InlineSpinner({ className }: { className?: string }) {
  return (
    <span
      className={[
        "inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--app-border-ui)] border-t-[var(--app-brand)]",
        className ?? "",
      ].join(" ")}
      aria-hidden="true"
    />
  );
}

function limitLabel(value: number | null | undefined) {
  if (value === null || value === undefined) return "Unlimited";
  return String(value);
}

function percentUsed(current: number, limit: number | null | undefined) {
  if (limit === null || limit === undefined) return 0;
  if (limit <= 0) return 100;
  return Math.min(100, Math.round((current / limit) * 100));
}

export function BillingPortalContent() {
  const currency = "ZMW";
  const invoiceListLimit = 25;
  const me = useBillingMeQuery();
  const plans = usePublicPlansQuery(currency);
  const invoices = useBillingInvoicesQuery(invoiceListLimit);
  const queryClient = useQueryClient();
  const createInvoice = useCreateInvoiceMutation();
  const startUssd = useStartLipilaPaymentMutation();
  const startMomo = useStartLipilaMomoCollectionMutation();
  const startCard = useStartLipilaCardCollectionMutation();
  const checkStatus = useCheckLipilaCollectionStatusMutation();

  const orderedPlans = useMemo(() => {
    const order: SubscriptionPlanCode[] = ["free", "basic", "pro", "enterprise"];
    const all = plans.data?.plans ?? [];
    return [...all].sort((a, b) => order.indexOf(a.code) - order.indexOf(b.code));
  }, [plans.data?.plans]);

  const currentPlanCode = me.data?.subscription?.planCode ?? "free";
  const defaultInterval = me.data?.subscription?.interval ?? "monthly";

  const [planCode, setPlanCode] = useState<SubscriptionPlanCode>(currentPlanCode);
  const [interval, setInterval] = useState<SubscriptionInterval>(defaultInterval);
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"ussd" | "momo" | "card">("ussd");
  const [momoMsisdn, setMomoMsisdn] = useState("");
  const [momoNetwork, setMomoNetwork] = useState("");
  const [paymentInfo, setPaymentInfo] = useState<{
    invoiceId: string;
    identifier: string;
    ussdDial: string;
    instructions: string;
    amountCents: number;
    currency: string;
  } | null>(null);
  const [collectionInfo, setCollectionInfo] = useState<{
    method: "momo" | "card";
    invoiceId: string;
    identifier: string;
    referenceId: string | null;
    message: string;
    checkoutUrl?: string | null;
    clientSecret?: string | null;
    latestStatus?: string | null;
  } | null>(null);
  const [uiError, setUiError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [callbackWait, setCallbackWait] = useState<
    | { state: "waiting"; invoiceId: string; startedAt: number }
    | { state: "success"; invoiceId: string; completedAt: number }
    | { state: "failed"; invoiceId: string; completedAt: number }
    | { state: "timeout"; invoiceId: string; completedAt: number }
    | null
  >(null);

  const callbackUnsubscribeRef = useRef<null | (() => void)>(null);
  const callbackTimeoutRef = useRef<null | ReturnType<typeof setTimeout>>(null);
  const callbackPollRef = useRef<null | number>(null);
  const callbackCompletedRef = useRef(false);

  useEffect(() => {
    setPlanCode(currentPlanCode);
  }, [currentPlanCode]);

  useEffect(() => {
    setInterval(defaultInterval);
  }, [defaultInterval]);

  useEffect(() => {
    return () => {
      callbackCompletedRef.current = true;
      if (callbackTimeoutRef.current) clearTimeout(callbackTimeoutRef.current);
      callbackTimeoutRef.current = null;
      if (callbackPollRef.current) window.clearInterval(callbackPollRef.current);
      callbackPollRef.current = null;
      callbackUnsubscribeRef.current?.();
      callbackUnsubscribeRef.current = null;
    };
  }, []);

  const limits = me.data?.entitlements?.limits ?? null;
  const usage = me.data?.usage ?? null;

  const pendingInvoices = (invoices.data?.invoices ?? []).filter((i) => i.status === "pending");

  function stopCallbackWait() {
    callbackCompletedRef.current = true;
    if (callbackTimeoutRef.current) clearTimeout(callbackTimeoutRef.current);
    callbackTimeoutRef.current = null;
    if (callbackPollRef.current) window.clearInterval(callbackPollRef.current);
    callbackPollRef.current = null;
    callbackUnsubscribeRef.current?.();
    callbackUnsubscribeRef.current = null;
    setCallbackWait(null);
  }

  function beginCallbackWait(invoiceId: string) {
    stopCallbackWait();

    callbackCompletedRef.current = false;
    const startedAt = Date.now();

    setCallbackWait({ state: "waiting", invoiceId, startedAt });

    // Poll invoices endpoint until invoice reaches a terminal status.
    callbackPollRef.current = window.setInterval(() => {
      if (callbackCompletedRef.current) return;

      void (async () => {
        try {
          const res = await fetchJson<{ invoice: InvoiceRow }>(apiUrl(`/billing/invoices/${invoiceId}`), {
            method: "GET",
          });
          const status = res.invoice?.status ?? null;

          if (status === "paid" || status === "failed") {
            callbackCompletedRef.current = true;

            if (callbackTimeoutRef.current) clearTimeout(callbackTimeoutRef.current);
            callbackTimeoutRef.current = null;

            if (callbackPollRef.current) window.clearInterval(callbackPollRef.current);
            callbackPollRef.current = null;

            setCallbackWait({
              state: status === "paid" ? "success" : "failed",
              invoiceId,
              completedAt: Date.now(),
            });

            await queryClient.invalidateQueries({ queryKey: billingMeQueryKey });
            await queryClient.invalidateQueries({ queryKey: billingInvoicesQueryKey });

            if (status === "paid") {
              // Force a hard refresh so all server-rendered data reflects the new subscription immediately.
              window.setTimeout(() => window.location.reload(), 600);
            }
          }
        } catch (e) {
          // Ignore transient polling errors.
        }
      })();
    }, 3000);

    callbackTimeoutRef.current = setTimeout(() => {
      if (callbackCompletedRef.current) return;
      callbackCompletedRef.current = true;

      if (callbackPollRef.current) window.clearInterval(callbackPollRef.current);
      callbackPollRef.current = null;
      callbackUnsubscribeRef.current?.();
      callbackUnsubscribeRef.current = null;

      setCallbackWait({
        state: "timeout",
        invoiceId,
        completedAt: Date.now(),
      });
    }, 60_000);
  }

  function callbackWaitMessage(invoiceId: string) {
    if (!callbackWait || callbackWait.invoiceId !== invoiceId) {
      return (
        <p className="text-xs text-[var(--app-text-secondary)]">
          After paying, the invoice will be marked paid when Lipila sends the callback.
        </p>
      );
    }

    switch (callbackWait.state) {
      case "waiting":
        return (
          <div className="flex items-center gap-2 text-xs text-[var(--app-text-secondary)]">
            <InlineSpinner />
            <p>Waiting for Lipila callback (up to 1 minute)…</p>
          </div>
        );
      case "success":
        return (
          <p className="text-xs text-[#065f46]">
            Subscription successful. Activating your plan now…
          </p>
        );
      case "failed":
        return (
          <p className="text-xs text-[#7f1d1d]">
            Payment failed. Please try again or use a different method.
          </p>
        );
      case "timeout":
        return (
          <p className="text-xs text-[var(--app-text-secondary)]">
            Provider is taking longer to respond. You can refresh status.
          </p>
        );
      default:
        return null;
    }
  }

  async function handleCreateInvoice() {
    setUiError(null);
    setPaymentInfo(null);
    setCollectionInfo(null);
    stopCallbackWait();
    setCopied(false);
    try {
      const result = await createInvoice.mutateAsync({ planCode, interval });
      setActiveInvoiceId(result.invoice.id);
    } catch (e) {
      setUiError(e instanceof Error ? e.message : "Could not create invoice.");
    }
  }

  async function handleStartUssd(invoiceId: string) {
    setUiError(null);
    setCopied(false);
    try {
      const result = await startUssd.mutateAsync({ invoiceId });
      setPaymentInfo(result);
      setCollectionInfo(null);
      setActiveInvoiceId(result.invoiceId);
      beginCallbackWait(result.invoiceId);
    } catch (e) {
      setUiError(e instanceof Error ? e.message : "Could not start payment.");
    }
  }

  async function handleStartMomo(invoiceId: string) {
    setUiError(null);
    setCopied(false);
    setPaymentInfo(null);
    try {
      const result = await startMomo.mutateAsync({
        invoiceId,
        msisdn: momoMsisdn.trim(),
        network: momoNetwork.trim() || undefined,
      });
      setCollectionInfo({
        method: "momo",
        invoiceId: result.invoiceId,
        identifier: result.identifier,
        referenceId: result.referenceId,
        message: result.message,
        latestStatus: result.status ?? null,
      });
      setActiveInvoiceId(result.invoiceId);
      beginCallbackWait(result.invoiceId);
    } catch (e) {
      setUiError(e instanceof Error ? e.message : "Could not start mobile money collection.");
    }
  }

  async function handleStartCard(invoiceId: string) {
    setUiError(null);
    setCopied(false);
    setPaymentInfo(null);
    try {
      const result = await startCard.mutateAsync({
        invoiceId,
        returnUrl: typeof window !== "undefined" ? window.location.href : undefined,
      });
      setCollectionInfo({
        method: "card",
        invoiceId: result.invoiceId,
        identifier: result.identifier,
        referenceId: result.referenceId,
        message: result.message,
        checkoutUrl: result.checkoutUrl,
        clientSecret: result.clientSecret,
        latestStatus: null,
      });
      setActiveInvoiceId(result.invoiceId);
      beginCallbackWait(result.invoiceId);
    } catch (e) {
      setUiError(e instanceof Error ? e.message : "Could not start card collection.");
    }
  }

  async function handleRefreshCollectionStatus(referenceId: string) {
    setUiError(null);
    try {
      const res = await checkStatus.mutateAsync({ referenceId });
      setCollectionInfo((prev) =>
        prev && prev.referenceId === referenceId
          ? { ...prev, latestStatus: res.status?.status ?? res.status?.message ?? "Updated" }
          : prev,
      );
    } catch (e) {
      setUiError(e instanceof Error ? e.message : "Could not refresh status.");
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore clipboard errors
    }
  }

  const selectedPlan = orderedPlans.find((p) => p.code === planCode) ?? null;
  const selectedPrice = selectedPlan?.prices?.[interval] ?? null;

  return (
    <div className="px-4 pb-16 pt-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1280px] space-y-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="font-[family-name:var(--font-manrope)] text-3xl font-extrabold tracking-tight text-[var(--app-text)]">
              Billing
            </h1>
            <p className="text-sm text-[var(--app-text-secondary)]">
              Manage your plan, invoices, and Lipila payments.
            </p>
          </div>
          <Link
            href={ROUTES.settings}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--app-input-bg)] px-4 py-2 text-sm font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-input-focus-bg)]"
          >
            <span className="material-symbols-outlined notranslate text-base">arrow_back</span>
            Back to settings
          </Link>
        </div>

        {uiError ? (
          <div className="rounded-xl border border-[#f2b8b5] bg-[#fdf3f3] p-4 text-sm text-[#7d2a2a]">
            {uiError}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Current plan */}
          <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-[var(--app-shadow-card)] lg:col-span-5">
            <h2 className="flex items-center gap-2 font-[family-name:var(--font-manrope)] text-lg font-extrabold text-[var(--app-text)]">
              <span className="material-symbols-outlined notranslate text-xl text-[var(--app-brand)]">
                verified
              </span>
              Current plan
            </h2>
            {me.isLoading ? (
              <p className="mt-4 text-sm text-[var(--app-text-muted)]">Loading subscription…</p>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-[var(--app-border-ui-soft)] bg-[var(--app-input-bg)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-[var(--app-text)]">
                        {me.data?.subscription?.planName ?? "Free"}
                      </p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--app-text-faint)]">
                        {me.data?.subscription?.planCode ?? "free"} · {me.data?.subscription?.interval ?? "monthly"}
                      </p>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-[rgba(20,184,166,0.12)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--app-brand)]">
                      {me.data?.subscription?.status ?? "active"}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-[var(--app-text-secondary)]">
                    <p>
                      <span className="font-semibold text-[var(--app-text)]">Period start:</span>{" "}
                      {formatWhen(me.data?.subscription?.currentPeriodStart)}
                    </p>
                    <p>
                      <span className="font-semibold text-[var(--app-text)]">Period end:</span>{" "}
                      {formatWhen(me.data?.subscription?.currentPeriodEnd)}
                    </p>
                    {me.data?.subscription?.scheduledPlanCode ? (
                      <p>
                        <span className="font-semibold text-[var(--app-text)]">Scheduled:</span>{" "}
                        {me.data.subscription.scheduledPlanCode}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--app-border-ui-soft)] bg-[var(--app-surface-subtle)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--app-text-faint)]">
                    Usage & limits
                  </p>
                  {!limits || !usage ? (
                    <p className="mt-3 text-sm text-[var(--app-text-muted)]">Usage data not available.</p>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {(
                        [
                          ["products", "Products"],
                          ["categories", "Categories"],
                          ["salesTransactions", "Sales transactions"],
                        ] as const
                      ).map(([key, label]) => {
                        const current = usage[key] ?? 0;
                        const limit = limits[key] ?? null;
                        const pct = percentUsed(current, limit);
                        return (
                          <div key={key} className="space-y-1">
                            <div className="flex items-center justify-between gap-3 text-xs">
                              <span className="font-semibold text-[var(--app-text)]">{label}</span>
                              <span className="font-semibold text-[var(--app-text-secondary)]">
                                {current} / {limitLabel(limit)}
                              </span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--app-input-bg)]">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${pct}%`,
                                  background:
                                    pct >= 90
                                      ? "linear-gradient(135deg, rgb(239, 68, 68) 0%, rgb(99, 102, 241) 100%)"
                                      : "linear-gradient(135deg, rgb(15, 185, 177) 0%, rgb(99, 102, 241) 100%)",
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Upgrade / payment */}
          <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-[var(--app-shadow-card)] lg:col-span-7">
            <h2 className="flex items-center gap-2 font-[family-name:var(--font-manrope)] text-lg font-extrabold text-[var(--app-text)]">
              <span className="material-symbols-outlined notranslate text-xl text-[var(--app-brand)]">
                credit_card
              </span>
              Upgrade or renew
            </h2>

            {plans.isLoading ? (
              <p className="mt-4 text-sm text-[var(--app-text-muted)]">Loading plans…</p>
            ) : plans.isError ? (
              <p className="mt-4 text-sm text-[var(--app-text-muted)]">Could not load plans.</p>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-[var(--app-border-ui-soft)] bg-[var(--app-input-bg)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--app-text-faint)]">
                    Select plan
                  </p>
                  <select
                    value={planCode}
                    onChange={(e) => setPlanCode(e.target.value as SubscriptionPlanCode)}
                    className="mt-2 w-full rounded-lg border border-[var(--app-border-ui)] bg-[var(--app-surface)] px-3 py-2 text-sm font-semibold text-[var(--app-text)] outline-none"
                  >
                    {orderedPlans.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-[var(--app-text-secondary)]">
                    {selectedPrice
                      ? `Price: ${formatMoney(selectedPrice.currency, selectedPrice.amountCents)} / ${interval}`
                      : "Pricing not configured for this interval."}
                  </p>
                </div>

                <div className="rounded-xl border border-[var(--app-border-ui-soft)] bg-[var(--app-input-bg)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--app-text-faint)]">
                    Billing interval
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {(["monthly", "quarterly", "yearly"] as const).map((i) => {
                      const active = interval === i;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setInterval(i)}
                          className={`min-w-0 rounded-lg px-2 py-2 text-[10px] font-extrabold uppercase tracking-[0.08em] whitespace-nowrap overflow-hidden text-ellipsis transition sm:px-3 sm:text-xs ${
                            active
                              ? "bg-[var(--app-brand)] text-white"
                              : "bg-[var(--app-surface)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface-subtle)]"
                          }`}
                        >
                          {i}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleCreateInvoice()}
                    disabled={createInvoice.isPending}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#0fb9b1] to-[#6366f1] px-4 py-3 text-sm font-extrabold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined notranslate text-base">receipt_long</span>
                    {createInvoice.isPending ? "Generating invoice…" : "Generate invoice"}
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6 space-y-4">
              {activeInvoiceId ? (
                <div className="rounded-xl border border-[var(--app-border-ui-soft)] bg-[var(--app-surface-subtle)] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-extrabold text-[var(--app-text)]">Payment instructions</p>
                      <p className="mt-1 text-xs text-[var(--app-text-secondary)]">
                        Start a Lipila payment for invoice{" "}
                        <span className="font-semibold text-[var(--app-text)]">{activeInvoiceId}</span>.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {(
                        [
                          ["ussd", "USSD", "dialpad"],
                          ["momo", "Mobile Money", "smartphone"],
                          ["card", "Card", "credit_card"],
                        ] as const
                      ).map(([key, label, icon]) => {
                        const active = paymentMethod === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setPaymentMethod(key)}
                            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-extrabold transition ${
                              active
                                ? "bg-[var(--app-brand)] text-white"
                                : "bg-[var(--app-surface)] text-[var(--app-text-muted)] hover:bg-[var(--app-input-bg)]"
                            }`}
                          >
                            <span className="material-symbols-outlined notranslate text-base">{icon}</span>
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {paymentMethod === "momo" ? (
                    <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-surface)] p-4 sm:grid-cols-3">
                      <div className="sm:col-span-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--app-text-faint)]">
                          Customer phone (MSISDN)
                        </p>
                        <input
                          value={momoMsisdn}
                          onChange={(e) => setMomoMsisdn(e.target.value)}
                          placeholder="e.g. 2609XXXXXXXX"
                          className="mt-1 w-full rounded-lg border border-[var(--app-border-ui)] bg-[var(--app-input-bg)] px-3 py-2 text-sm font-semibold text-[var(--app-text)] outline-none"
                        />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--app-text-faint)]">
                          Network (optional)
                        </p>
                        <input
                          value={momoNetwork}
                          onChange={(e) => setMomoNetwork(e.target.value)}
                          placeholder="e.g. AirtelMoney"
                          className="mt-1 w-full rounded-lg border border-[var(--app-border-ui)] bg-[var(--app-input-bg)] px-3 py-2 text-sm font-semibold text-[var(--app-text)] outline-none"
                        />
                      </div>
                      <div className="sm:col-span-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => void handleStartMomo(activeInvoiceId)}
                          disabled={startMomo.isPending || momoMsisdn.trim().length < 7}
                          className="inline-flex items-center gap-2 rounded-xl bg-[var(--app-brand)] px-4 py-2 text-xs font-extrabold text-white transition hover:opacity-95 disabled:opacity-60"
                        >
                          <span className="material-symbols-outlined notranslate text-base">send</span>
                          {startMomo.isPending ? "Starting…" : "Request payment"}
                        </button>
                      </div>
                    </div>
                  ) : paymentMethod === "card" ? (
                    <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => void handleStartCard(activeInvoiceId)}
                        disabled={startCard.isPending}
                        className="inline-flex items-center gap-2 rounded-xl bg-[var(--app-brand)] px-4 py-2 text-xs font-extrabold text-white transition hover:opacity-95 disabled:opacity-60"
                      >
                        <span className="material-symbols-outlined notranslate text-base">credit_card</span>
                        {startCard.isPending ? "Starting…" : "Open checkout"}
                      </button>
                    </div>
                  ) : (
                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => void handleStartUssd(activeInvoiceId)}
                        disabled={startUssd.isPending}
                        className="inline-flex items-center gap-2 rounded-xl bg-[var(--app-brand)] px-4 py-2 text-xs font-extrabold text-white transition hover:opacity-95 disabled:opacity-60"
                      >
                        <span className="material-symbols-outlined notranslate text-base">dialpad</span>
                        {startUssd.isPending ? "Preparing…" : "Show USSD"}
                      </button>
                    </div>
                  )}

                  {paymentInfo ? (
                    <div className="mt-4 space-y-3">
                      <div className="grid grid-cols-1 gap-3 rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-surface)] p-4 sm:grid-cols-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--app-text-faint)]">
                            Amount
                          </p>
                          <p className="mt-1 text-sm font-extrabold text-[var(--app-text)]">
                            {formatMoney(paymentInfo.currency, paymentInfo.amountCents)}
                          </p>
                        </div>
                        <div className="sm:col-span-2">
                          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--app-text-faint)]">
                            USSD
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <code className="rounded-lg bg-[var(--app-input-bg)] px-3 py-2 text-sm font-extrabold text-[var(--app-text)]">
                              {paymentInfo.ussdDial}
                            </code>
                            <button
                              type="button"
                              onClick={() => void copy(paymentInfo.ussdDial)}
                              className="rounded-lg bg-[var(--app-brand)] px-3 py-2 text-xs font-extrabold text-white transition hover:opacity-95"
                            >
                              {copied ? "Copied" : "Copy"}
                            </button>
                          </div>
                          <p className="mt-2 text-xs text-[var(--app-text-secondary)]">
                            {paymentInfo.instructions}
                          </p>
                        </div>
                      </div>
                      {callbackWaitMessage(paymentInfo.invoiceId)}
                    </div>
                  ) : null}

                  {collectionInfo ? (
                    <div className="mt-4 space-y-3">
                      <div className="rounded-xl border border-[var(--app-border-ui)] bg-[var(--app-surface)] p-4">
                        <p className="text-sm font-extrabold text-[var(--app-text)]">
                          {collectionInfo.method === "momo" ? "Mobile Money" : "Card"} collection
                        </p>
                        <p className="mt-1 text-xs text-[var(--app-text-secondary)]">{collectionInfo.message}</p>
                        {callbackWait && callbackWait.invoiceId === collectionInfo.invoiceId ? (
                          <div className="mt-2">{callbackWaitMessage(collectionInfo.invoiceId)}</div>
                        ) : null}

                        {collectionInfo.checkoutUrl ? (
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <a
                              href={collectionInfo.checkoutUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-xl bg-[var(--app-brand)] px-4 py-2 text-xs font-extrabold text-white transition hover:opacity-95"
                            >
                              <span className="material-symbols-outlined notranslate text-base">open_in_new</span>
                              Open Lipila checkout
                            </a>
                            <span className="text-[10px] font-semibold text-[var(--app-text-faint)]">
                              (Opens in a new tab)
                            </span>
                          </div>
                        ) : null}

                        {collectionInfo.referenceId ? (
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                            <div className="text-xs">
                              <span className="font-semibold text-[var(--app-text)]">Reference:</span>{" "}
                              <span className="font-mono text-[var(--app-text-secondary)]">{collectionInfo.referenceId}</span>
                              {collectionInfo.latestStatus ? (
                                <>
                                  <span className="mx-2 text-[var(--app-text-faint)]">·</span>
                                  <span className="font-semibold text-[var(--app-text)]">Status:</span>{" "}
                                  <span className="text-[var(--app-text-secondary)]">{collectionInfo.latestStatus}</span>
                                </>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              onClick={() => void handleRefreshCollectionStatus(collectionInfo.referenceId!)}
                              disabled={checkStatus.isPending || callbackWait?.state === "waiting"}
                              className="inline-flex items-center gap-2 rounded-xl bg-[var(--app-input-bg)] px-3 py-2 text-xs font-extrabold text-[var(--app-text)] transition hover:bg-[var(--app-input-focus-bg)] disabled:opacity-60"
                            >
                              <span className="material-symbols-outlined notranslate text-base">refresh</span>
                              {checkStatus.isPending ? "Refreshing…" : "Refresh status"}
                            </button>
                          </div>
                        ) : (
                          <p className="mt-3 text-xs text-[var(--app-text-muted)]">
                            No referenceId returned yet — confirm Lipila initiation endpoint configuration.
                          </p>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>
        </div>

        {/* Invoices */}
        <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-[var(--app-shadow-card)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-[family-name:var(--font-manrope)] text-lg font-extrabold text-[var(--app-text)]">
              <span className="material-symbols-outlined notranslate text-xl text-[var(--app-brand)]">
                request_quote
              </span>
              Invoices
            </h2>
            {pendingInvoices.length ? (
              <p className="text-xs font-semibold text-[var(--app-text-secondary)]">
                {pendingInvoices.length} pending
              </p>
            ) : null}
          </div>

          {invoices.isLoading ? (
            <p className="mt-4 text-sm text-[var(--app-text-muted)]">Loading invoices…</p>
          ) : invoices.isError ? (
            <p className="mt-4 text-sm text-[var(--app-text-muted)]">Could not load invoices.</p>
          ) : !invoices.data?.invoices.length ? (
            <p className="mt-4 text-sm text-[var(--app-text-muted)]">No invoices yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-left text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--app-text-faint)]">
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Plan</th>
                    <th className="px-3 py-2">Amount</th>
                    <th className="px-3 py-2">Created</th>
                    <th className="px-3 py-2">Paid</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.data.invoices.map((inv) => {
                    const canPay = inv.status === "pending" || inv.status === "failed";
                    const isActive = activeInvoiceId === inv.id;
                    return (
                      <tr
                        key={inv.id}
                        className={`rounded-xl border ${
                          isActive ? "border-[var(--app-brand)]" : "border-[var(--app-border-ui-soft)]"
                        } bg-[var(--app-input-bg)]`}
                      >
                        <td className="px-3 py-3">{statusBadge(inv.status)}</td>
                        <td className="px-3 py-3">
                          <p className="text-sm font-extrabold text-[var(--app-text)]">{inv.planName}</p>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--app-text-faint)]">
                            {inv.planCode} · {inv.interval}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          <p className="text-sm font-extrabold text-[var(--app-text)]">
                            {formatMoney(inv.currency, inv.amountCents)}
                          </p>
                          <p className="text-[10px] font-semibold text-[var(--app-text-faint)]">{inv.identifier}</p>
                        </td>
                        <td className="px-3 py-3 text-xs text-[var(--app-text-secondary)]">{formatWhen(inv.createdAt)}</td>
                        <td className="px-3 py-3 text-xs text-[var(--app-text-secondary)]">{formatWhen(inv.paidAt)}</td>
                        <td className="px-3 py-3 text-right">
                          <button
                            type="button"
                            disabled={!canPay || startUssd.isPending || startMomo.isPending || startCard.isPending}
                            onClick={() => {
                              setActiveInvoiceId(inv.id);
                              if (paymentMethod === "momo") {
                                void handleStartMomo(inv.id);
                              } else if (paymentMethod === "card") {
                                void handleStartCard(inv.id);
                              } else {
                                void handleStartUssd(inv.id);
                              }
                            }}
                            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-extrabold transition ${
                              canPay
                                ? "bg-[var(--app-brand)] text-white hover:opacity-95"
                                : "bg-[var(--app-surface)] text-[var(--app-text-faint)]"
                            } disabled:opacity-60`}
                          >
                            <span className="material-symbols-outlined notranslate text-base">
                              {canPay ? "dialpad" : "done"}
                            </span>
                            {canPay ? "Pay" : "Paid"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="text-xs text-[var(--app-text-muted)]">
          Need help? Start with the pricing page at{" "}
          <Link
            href={ROUTES.marketing.pricing}
            className="font-semibold text-[var(--app-link-teal)] underline decoration-[rgba(20,184,166,0.35)]"
          >
            plans & features
          </Link>
          .
        </div>
      </div>
    </div>
  );
}

