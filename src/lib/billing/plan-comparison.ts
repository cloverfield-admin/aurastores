import type { SubscriptionPlanFeatures } from "@/lib/db/schema/billing.schema";
import type { PublicPlan, SubscriptionPlanCode } from "@/lib/repositories/billing/billing.repository";

/**
 * A complete, plain-language comparison of every public plan, built from the
 * plans' real capability flags and limits.
 *
 * Deliberately exhaustive. The landing cards fold shared features into
 * "Everything in {previous}" and cut the list at six bullets, which is fine for
 * a card and useless for deciding — it never says what a plan does NOT include,
 * and it silently omitted Enterprise entirely. This is the long form both the
 * marketing page and the billing portal read, so the two can never drift.
 */

type CapabilityKey = keyof SubscriptionPlanFeatures["capabilities"];
type Limits = SubscriptionPlanFeatures["limits"];

/** Rendered as a tick, a dash, or a value like "Unlimited". */
export type ComparisonValue =
  | { kind: "included" }
  | { kind: "excluded" }
  | { kind: "text"; text: string };

export type ComparisonRow = {
  key: string;
  label: string;
  /** What the feature actually does, in the customer's words. */
  hint: string;
  /** Keyed by plan code, one entry per plan in `plans`. */
  values: Record<string, ComparisonValue>;
};

export type ComparisonSection = {
  title: string;
  rows: ComparisonRow[];
};

export type ComparisonPlan = {
  code: SubscriptionPlanCode;
  name: string;
  /** Pre-formatted, e.g. "ZMW 500" — null when the plan has no price at that interval. */
  monthlyPrice: string | null;
  yearlyPrice: string | null;
  /** Free has nothing to buy; Enterprise is sold by conversation. */
  purchasable: boolean;
};

export type PlanComparison = {
  plans: ComparisonPlan[];
  sections: ComparisonSection[];
};

/**
 * Every capability a plan can carry, with a description of what it unlocks.
 *
 * The landing's own list omitted `catalog` and `expenses`, so two things a
 * customer pays for were invisible on the page selling them.
 */
const CAPABILITIES: Array<{ key: CapabilityKey; label: string; hint: string }> = [
  {
    key: "stock",
    label: "Aura Stock",
    hint: "Track inventory, batches and expiry across your shelves.",
  },
  {
    key: "sales",
    label: "Sales & checkout",
    hint: "Ring up sales, take payments and see what sold.",
  },
  {
    key: "catalog",
    label: "Products & categories",
    hint: "Build and organise your product catalogue.",
  },
  {
    key: "insights",
    label: "Aura Insights",
    hint: "Demand forecasts and risk signals before they cost you a sale.",
  },
  {
    key: "expenses",
    label: "Expenses",
    hint: "Log restocking, running costs and provider charges against each branch.",
  },
  {
    key: "pay",
    label: "Aura Pay",
    hint: "Mobile-money collection, a wallet and withdrawals in-app.",
  },
  {
    key: "staff",
    label: "Staff & permissions",
    hint: "Invite your team, assign branches and choose what each role can see.",
  },
  {
    key: "organization",
    label: "Organization controls",
    hint: "Branch setup, business details and organization-wide settings.",
  },
];

const numberFmt = new Intl.NumberFormat("en-US");

/** A null limit means unlimited — the DB uses null rather than a sentinel. */
function limitText(value: number | null, unit: string): string {
  if (value == null) return "Unlimited";
  return `${numberFmt.format(value)} ${unit}`.trim();
}

const LIMITS: Array<{ key: keyof Limits; label: string; hint: string; unit: string }> = [
  {
    key: "branches",
    label: "Branches",
    hint: "Locations you can run and report on separately.",
    unit: "",
  },
  {
    key: "staffUsers",
    label: "Staff accounts",
    hint: "People who can sign in, including you.",
    unit: "",
  },
  {
    key: "products",
    label: "Products",
    hint: "Distinct items in your catalogue.",
    unit: "",
  },
  {
    key: "categories",
    label: "Categories",
    hint: "Groupings you can file products under.",
    unit: "",
  },
  {
    key: "salesTransactions",
    label: "Sales per month",
    hint: "Completed sales recorded each month.",
    unit: "/ month",
  },
];

function formatPrice(amountCents: number, currency: string): string {
  // Seeds store the amount in cents; plans are priced in whole units.
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
}

/**
 * Builds the comparison from the plans the billing repository already returns.
 * Every public plan is included, in the order the database gives them —
 * Enterprise included, because a customer deciding between tiers deserves to
 * see the one above the one they are looking at.
 */
export function buildPlanComparison(plans: PublicPlan[]): PlanComparison {
  const ordered = [...plans].sort((a, b) => a.sortOrder - b.sortOrder);

  const comparisonPlans: ComparisonPlan[] = ordered.map((p) => {
    const monthly = p.prices.monthly;
    const yearly = p.prices.yearly;
    return {
      code: p.code,
      name: p.name,
      monthlyPrice: monthly ? formatPrice(monthly.amountCents, monthly.currency) : null,
      yearlyPrice: yearly ? formatPrice(yearly.amountCents, yearly.currency) : null,
      // Free has nothing to buy; Enterprise is priced by conversation, so it
      // carries no self-serve price row.
      purchasable: p.code === "basic" || p.code === "pro",
    };
  });

  const capabilityRows: ComparisonRow[] = CAPABILITIES.map(({ key, label, hint }) => ({
    key,
    label,
    hint,
    values: Object.fromEntries(
      ordered.map((p): [string, ComparisonValue] => [
        p.code,
        p.features.capabilities[key] ? { kind: "included" } : { kind: "excluded" },
      ]),
    ),
  }));

  const limitRows: ComparisonRow[] = LIMITS.map(({ key, label, hint, unit }) => ({
    key,
    label,
    hint,
    values: Object.fromEntries(
      ordered.map((p): [string, ComparisonValue] => [
        p.code,
        { kind: "text", text: limitText(p.features.limits[key], unit) },
      ]),
    ),
  }));

  return {
    plans: comparisonPlans,
    sections: [
      { title: "What's included", rows: capabilityRows },
      { title: "Limits", rows: limitRows },
    ],
  };
}

/**
 * One plan's contents as two plain lists, for surfaces with no room for a
 * table — the billing checkout, where a customer is one click from paying and
 * should still be able to see what they are buying.
 */
export function planContents(
  plan: PublicPlan,
): { included: string[]; excluded: string[]; limits: Array<{ label: string; value: string }> } {
  const included: string[] = [];
  const excluded: string[] = [];
  for (const { key, label } of CAPABILITIES) {
    (plan.features.capabilities[key] ? included : excluded).push(label);
  }
  return {
    included,
    excluded,
    limits: LIMITS.map(({ key, label, unit }) => ({
      label,
      value: limitText(plan.features.limits[key], unit),
    })),
  };
}

/**
 * What moving from `against` to `plan` would change, as two short lists.
 *
 * The plan chooser used to show a name and a price only, which asks someone to
 * decide on an upgrade without saying what the upgrade is. Naming the modules
 * that appear (and the rarer case of ones that disappear on a downgrade) turns
 * that into an informed choice.
 */
export function planDelta(
  plan: PublicPlan,
  against: PublicPlan | null | undefined,
): { adds: string[]; removes: string[] } {
  if (!against) {
    return {
      adds: CAPABILITIES.filter(({ key }) => plan.features.capabilities[key]).map((c) => c.label),
      removes: [],
    };
  }
  const adds: string[] = [];
  const removes: string[] = [];
  for (const { key, label } of CAPABILITIES) {
    const now = against.features.capabilities[key];
    const next = plan.features.capabilities[key];
    if (next && !now) adds.push(label);
    if (now && !next) removes.push(label);
  }
  return { adds, removes };
}
