/**
 * Rules for the web billing portal (`/billing/*`).
 *
 * The web app is the platform console; store operators run their business from
 * the mobile app. The one exception is money: Apple takes a cut of in-app
 * purchases, so owners and managers can pay for, renew and upgrade a plan on the
 * web. Nothing else about the store is reachable here.
 *
 * Everything in this file is presentation only. Prices, proration and the period
 * a payment buys are decided by the engine and confirmed by the Lenco webhook —
 * a number rendered here is a copy of the server's answer, never the source of
 * one.
 */

/** Membership roles that may sign in to the billing portal. */
export const BILLING_ROLES = ["owner", "manager"] as const;

export type BillingRole = (typeof BILLING_ROLES)[number];

export function isBillingRole(role: string | null | undefined): role is BillingRole {
  return typeof role === "string" && (BILLING_ROLES as readonly string[]).includes(role);
}

/**
 * The product calls these Store Owner and Store Manager; the membership table
 * calls them `owner` and `manager` (see the app_role enum, mirrored in the
 * engine's userctx.Role* constants). Only the labels differ.
 */
export function billingRoleLabel(role: BillingRole): string {
  return role === "owner" ? "STORE OWNER" : "STORE MANAGER";
}

/**
 * Managers can keep the lights on — pay and renew the plan they are on. Moving
 * the organization to a different tier is an owner's decision, since it changes
 * what every branch is billed and entitled to.
 */
export function canChangePlanTier(role: BillingRole): boolean {
  return role === "owner";
}

export const BILLING_CURRENCY = "ZMW";

const MONEY = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const MONEY_WHOLE = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** `ZMW 5,000.00`. */
export function formatMoney(amountCents: number, currency = BILLING_CURRENCY): string {
  return `${currency} ${MONEY.format(amountCents / 100)}`;
}

/** `ZMW 5,000` — for headline prices, where trailing zeros are noise. */
export function formatMoneyCompact(amountCents: number, currency = BILLING_CURRENCY): string {
  const value = amountCents / 100;
  return Number.isInteger(value)
    ? `${currency} ${MONEY_WHOLE.format(value)}`
    : `${currency} ${MONEY.format(value)}`;
}

/**
 * Dates read day-first ("12 Sep 2026"), as the design renders them and as Zambia
 * writes them, but the month abbreviation is en-US's: plain en-US would order it
 * "Sep 12, 2026", and en-GB spells September "Sept". Assembling from parts gets
 * both halves right. Money stays en-US grouped, as the spec asks.
 *
 * UTC throughout so a label cannot drift a day against the engine's dates.
 */
const DATE_PARTS = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function dayFirst(date: Date, withYear: boolean): string {
  const parts = DATE_PARTS.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const head = `${get("day")} ${get("month")}`;
  return withYear ? `${head} ${get("year")}` : head;
}

/** `12 Sep 2026`. Formatted in UTC so the label cannot drift by a day. */
export function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : dayFirst(date, true);
}

/** `12 Aug`. */
export function formatDateShort(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : dayFirst(date, false);
}

/**
 * Whole days from now until `iso`, floored at 0. Used only for the "in 24 days"
 * hint under the renewal date — the engine decides when a period actually ends.
 */
export function daysUntil(iso: string | null | undefined, now: Date = new Date()): number | null {
  if (!iso) return null;
  const end = new Date(iso);
  if (Number.isNaN(end.getTime())) return null;
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86_400_000));
}

export type IntervalKey = "monthly" | "quarterly" | "yearly";

export function intervalLabel(interval: IntervalKey | string): string {
  switch (interval) {
    case "monthly":
      return "Monthly";
    case "quarterly":
      return "Quarterly";
    case "yearly":
      return "Annual";
    default:
      return interval;
  }
}

export function intervalPerLabel(interval: IntervalKey | string): string {
  switch (interval) {
    case "monthly":
      return "/ month";
    case "quarterly":
      return "/ quarter";
    case "yearly":
      return "/ year";
    default:
      return "";
  }
}

/**
 * The saving an annual price represents against paying monthly for a year, or
 * null when either price is missing or annual is not actually cheaper.
 *
 * Display only: the amount charged is whatever the engine quotes on the invoice.
 */
export function annualSaving(
  monthlyCents: number | undefined,
  yearlyCents: number | undefined,
): { amountCents: number; monthsFree: number } | null {
  if (!monthlyCents || !yearlyCents) return null;
  const listCents = monthlyCents * 12;
  const amountCents = listCents - yearlyCents;
  if (amountCents <= 0) return null;
  return { amountCents, monthsFree: Math.round(amountCents / monthlyCents) };
}

/**
 * Zambian mobile-money networks Lenco collects from, with the national prefixes
 * each one issues.
 *
 * The engine works the operator out from the number itself, so these prefixes
 * are not what routes the payment — they are here so a number that disagrees
 * with the network the payer picked is caught before a collection is started
 * against the wrong handset.
 */
export const MOMO_NETWORKS = [
  { key: "mtn", label: "MTN MoMo", dot: "#f5c518", prefixes: ["96", "76"] },
  { key: "airtel", label: "Airtel Money", dot: "#e0301e", prefixes: ["97", "77"] },
  { key: "zamtel", label: "Zamtel Kwacha", dot: "#00a651", prefixes: ["95", "75"] },
] as const;

export type MomoNetwork = (typeof MOMO_NETWORKS)[number]["key"];

/** The network that issued this number, or null when the prefix is unknown. */
export function networkForMsisdn(msisdn: string | null): MomoNetwork | null {
  if (!msisdn) return null;
  const national = msisdn.replace(/^260/, "");
  const found = MOMO_NETWORKS.find((n) =>
    (n.prefixes as readonly string[]).some((prefix) => national.startsWith(prefix)),
  );
  return found?.key ?? null;
}

export function networkLabel(network: MomoNetwork): string {
  return MOMO_NETWORKS.find((n) => n.key === network)?.label ?? network;
}

/**
 * Normalizes local input to the 12-digit MSISDN the engine expects (260XXXXXXXXX),
 * accepting `097…`, `+260 97…` and spaced variants. Returns null when the digits
 * cannot form a Zambian number — the engine validates again regardless.
 */
export function normalizeZambianMsisdn(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  const national = digits.startsWith("260")
    ? digits.slice(3)
    : digits.startsWith("0")
      ? digits.slice(1)
      : digits;
  if (national.length !== 9) return null;
  return `260${national}`;
}

/** `097 784 2210` → grouped for display while typing. */
export function formatMsisdnInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").replace(/^260/, "").replace(/^0/, "").slice(0, 9);
  const parts = [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 9)].filter(Boolean);
  return parts.join(" ");
}

/** Last four digits, for the payment-history method column. */
export function maskTail(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 4 ? `··· ${digits.slice(-4)}` : null;
}
