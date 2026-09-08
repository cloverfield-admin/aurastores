import { describe, expect, it } from "vitest";
import { buildPlanComparison, planContents, planDelta } from "@/lib/billing/plan-comparison";
import type { PublicPlan } from "@/lib/repositories/billing/billing.repository";

function plan(over: Partial<PublicPlan> & Pick<PublicPlan, "code" | "name" | "sortOrder">): PublicPlan {
  return {
    features: {
      capabilities: {
        stock: true,
        sales: true,
        catalog: true,
        insights: false,
        pay: false,
        staff: false,
        expenses: false,
        organization: true,
      },
      limits: { products: 10, salesTransactions: 10, categories: 10, staffUsers: 1, branches: 1 },
    },
    prices: {},
    ...over,
  } as PublicPlan;
}

const free = plan({ code: "free", name: "Free", sortOrder: 1 });
const pro = plan({
  code: "pro",
  name: "Pro",
  sortOrder: 3,
  features: {
    capabilities: {
      stock: true,
      sales: true,
      catalog: true,
      insights: true,
      pay: false,
      staff: true,
      expenses: true,
      organization: true,
    },
    limits: { products: null, salesTransactions: null, categories: null, staffUsers: 10, branches: 3 },
  },
  prices: { monthly: { amountCents: 50000, currency: "ZMW" } },
});
const enterprise = plan({
  code: "enterprise",
  name: "Enterprise",
  sortOrder: 4,
  features: {
    capabilities: {
      stock: true,
      sales: true,
      catalog: true,
      insights: true,
      pay: true,
      staff: true,
      expenses: true,
      organization: true,
    },
    limits: {
      products: null,
      salesTransactions: null,
      categories: null,
      staffUsers: null,
      branches: null,
    },
  },
});

describe("buildPlanComparison", () => {
  // Enterprise was omitted from the landing entirely, so the page selling the
  // tiers never mentioned the top one.
  it("includes every public plan, in sort order", () => {
    const c = buildPlanComparison([pro, enterprise, free]);
    expect(c.plans.map((p) => p.code)).toEqual(["free", "pro", "enterprise"]);
  });

  it("states what a plan does NOT include rather than omitting the row", () => {
    const c = buildPlanComparison([free, pro]);
    const insights = c.sections[0].rows.find((r) => r.key === "insights");

    expect(insights?.values.free).toEqual({ kind: "excluded" });
    expect(insights?.values.pro).toEqual({ kind: "included" });
  });

  // The landing's own bullet list omitted these two, so features a customer
  // pays for were invisible on the page selling them.
  it("covers the capabilities the marketing bullets left out", () => {
    const keys = buildPlanComparison([free]).sections[0].rows.map((r) => r.key);
    expect(keys).toContain("catalog");
    expect(keys).toContain("expenses");
  });

  it("renders a null limit as Unlimited rather than blank", () => {
    const c = buildPlanComparison([free, enterprise]);
    const products = c.sections[1].rows.find((r) => r.key === "products");

    expect(products?.values.free).toEqual({ kind: "text", text: "10" });
    expect(products?.values.enterprise).toEqual({ kind: "text", text: "Unlimited" });
  });

  it("formats prices from cents into whole currency units", () => {
    const c = buildPlanComparison([pro]);
    // Intl separates the currency with a non-breaking space, so normalise
    // before comparing rather than pasting an invisible character into the test.
    expect(c.plans[0].monthlyPrice?.replace(/\s/g, " ")).toBe("ZMW 500");
    expect(c.plans[0].yearlyPrice).toBeNull();
  });

  it("marks only the self-serve tiers purchasable", () => {
    const c = buildPlanComparison([free, pro, enterprise]);
    const by = Object.fromEntries(c.plans.map((p) => [p.code, p.purchasable]));

    expect(by.pro).toBe(true);
    expect(by.free).toBe(false);
    expect(by.enterprise).toBe(false);
  });

  it("survives an empty plan list", () => {
    expect(buildPlanComparison([]).plans).toEqual([]);
  });
});

describe("planContents", () => {
  it("returns both halves, because the excluded half is what people check", () => {
    const c = planContents(free);
    expect(c.included).toContain("Aura Stock");
    expect(c.excluded).toContain("Aura Insights");
    expect(c.excluded).toContain("Aura Pay");
  });

  it("lists every limit with a readable value", () => {
    expect(planContents(free).limits).toContainEqual({ label: "Sales per month", value: "10 / month" });
    expect(planContents(enterprise).limits).toContainEqual({ label: "Branches", value: "Unlimited" });
  });
});

describe("planDelta", () => {
  it("names what an upgrade adds", () => {
    const { adds, removes } = planDelta(pro, free);
    expect(adds).toEqual(["Aura Insights", "Expenses", "Staff & permissions"]);
    expect(removes).toEqual([]);
  });

  // Downgrades are rarer but far more important to state plainly.
  it("names what a downgrade gives up", () => {
    const { adds, removes } = planDelta(free, pro);
    expect(adds).toEqual([]);
    expect(removes).toEqual(["Aura Insights", "Expenses", "Staff & permissions"]);
  });

  it("falls back to the plan's own contents with nothing to compare against", () => {
    expect(planDelta(free, null).adds).toContain("Aura Stock");
  });
});
