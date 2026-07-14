import type { SubscriptionPlanFeatures } from "@/lib/db/schema/billing.schema";
import type { PublicPlan } from "@/lib/repositories/billing/billing.repository";

/** Plans surfaced on the marketing landing, in display order (Enterprise omitted). */
const LANDING_PLAN_ORDER = ["free", "basic", "pro"] as const;
export type LandingPlanCode = (typeof LANDING_PLAN_ORDER)[number];

export type LandingPlan = {
  code: LandingPlanCode;
  name: string;
  tagline: string;
  /** Pro is the highlighted "Most popular" card. */
  featured: boolean;
  /** Pre-formatted prices, e.g. "ZMW 500". `yearly` is null when no yearly price exists. */
  monthlyPrice: string;
  yearlyPrice: string | null;
  /** Fine print under the price, per billing interval. */
  monthlyNote: string;
  yearlyNote: string;
  bullets: string[];
  ctaLabel: string;
  ctaHref: string;
};

const zmw = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "ZMW",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function formatPrice(amountCents: number): string {
  // Seeds store ZMW as cents (amount * 100); render whole units.
  return zmw.format(amountCents / 100);
}

const CAPABILITY_LABELS: Array<{
  key: keyof SubscriptionPlanFeatures["capabilities"];
  label: string;
}> = [
  { key: "stock", label: "Aura Stock" },
  { key: "sales", label: "Sales tracking" },
  { key: "insights", label: "Aura Insights" },
  { key: "pay", label: "Aura Pay" },
  { key: "staff", label: "Staff management" },
  { key: "organization", label: "Organization controls" },
];

type Limits = SubscriptionPlanFeatures["limits"];

function branchesLabel(branches: Limits["branches"]): string {
  if (branches == null) return "Unlimited branch sync";
  if (branches <= 1) return "Single branch";
  return `Multi-branch sync (up to ${branches})`;
}

function catalogLabel(products: Limits["products"], categories: Limits["categories"]): string {
  const productsPart = products == null ? "Unlimited products" : `${products} products`;
  const categoriesPart = categories == null ? "unlimited categories" : `${categories} categories`;
  if (products == null && categories == null) return "Unlimited products & categories";
  return `${productsPart} · ${categoriesPart}`;
}

function salesLabel(salesTransactions: Limits["salesTransactions"]): string {
  return salesTransactions == null
    ? "Unlimited sales"
    : `${salesTransactions} sales / month`;
}

function staffLabel(staffUsers: Limits["staffUsers"]): string {
  if (staffUsers == null) return "Unlimited staff users";
  return staffUsers === 1 ? "1 staff user" : `${staffUsers} staff users`;
}

/**
 * Build up to 6 accurate feature bullets from a plan's real capabilities and
 * limits, folding shared features into an "Everything in {prev}" line and
 * skipping limit lines that are unchanged from the previous tier.
 */
function buildBullets(plan: PublicPlan, prev: PublicPlan | undefined): string[] {
  const out: string[] = [];
  if (prev) out.push(`Everything in ${prev.name}`);

  const caps = plan.features.capabilities;
  const prevCaps = prev?.features.capabilities ?? null;
  for (const { key, label } of CAPABILITY_LABELS) {
    if (!caps[key]) continue;
    if (prevCaps && prevCaps[key]) continue;
    out.push(label);
  }

  const limits = plan.features.limits;
  const prevLimits = prev?.features.limits ?? null;
  const limitLines: Array<[string, boolean]> = [
    [branchesLabel(limits.branches), !prevLimits || branchesLabel(prevLimits.branches) !== branchesLabel(limits.branches)],
    [
      catalogLabel(limits.products, limits.categories),
      !prevLimits ||
        catalogLabel(prevLimits.products, prevLimits.categories) !==
          catalogLabel(limits.products, limits.categories),
    ],
    [salesLabel(limits.salesTransactions), !prevLimits || salesLabel(prevLimits.salesTransactions) !== salesLabel(limits.salesTransactions)],
    [staffLabel(limits.staffUsers), !prevLimits || staffLabel(prevLimits.staffUsers) !== staffLabel(limits.staffUsers)],
  ];
  for (const [line, changed] of limitLines) {
    if (changed) out.push(line);
  }

  return out.slice(0, 6);
}

const TAGLINES: Record<LandingPlanCode, string> = {
  free: "Start with the essentials for a single location.",
  basic: "Built for small teams ready to scale.",
  pro: "Advanced analytics for growing multi-branch teams.",
};

const CTA_LABELS: Record<LandingPlanCode, string> = {
  free: "Get started",
  basic: "Choose Basic",
  pro: "Choose Pro",
};

/**
 * Every plan CTA points at the app download.
 *
 * These used to deep-link into web sign-up with the plan preselected
 * (`/auth/register?plan=pro`). Web sign-up is closed — stores are created in the
 * mobile app — so that link would have walked a paying customer into a dead end.
 * The plan is still chosen in-app, at the same point in the flow.
 */
const CTA_HREF = "#download";

/**
 * Shape the public plans returned by billing into the landing's Free / Basic /
 * Pro cards. Prices, bullets, and CTAs are all derived from live plan data so
 * the marketing page can never drift from what billing actually offers.
 */
export function buildLandingPlans(plans: PublicPlan[]): LandingPlan[] {
  const byCode = new Map(plans.map((p) => [p.code, p]));
  const ordered = LANDING_PLAN_ORDER.map((code) => byCode.get(code)).filter(
    (p): p is PublicPlan => Boolean(p),
  );

  return ordered.map((plan, index): LandingPlan => {
    const prev = index > 0 ? ordered[index - 1] : undefined;
    const code = plan.code as LandingPlanCode;
    const monthly = plan.prices.monthly;
    const yearly = plan.prices.yearly;
    const isFree = code === "free";

    return {
      code,
      name: plan.name,
      tagline: TAGLINES[code] ?? "",
      featured: code === "pro",
      monthlyPrice: monthly ? formatPrice(monthly.amountCents) : "Custom",
      yearlyPrice: yearly ? formatPrice(yearly.amountCents) : null,
      monthlyNote: isFree ? "Free forever · no card required" : "Billed monthly · cancel anytime",
      yearlyNote: isFree ? "Free forever · no card required" : "Billed annually · 12 months upfront",
      bullets: buildBullets(plan, prev),
      ctaLabel: CTA_LABELS[code],
      ctaHref: CTA_HREF,
    };
  });
}
