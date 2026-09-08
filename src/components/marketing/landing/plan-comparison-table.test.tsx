import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PlanComparisonTable } from "@/components/marketing/landing/plan-comparison-table";
import { buildPlanComparison } from "@/lib/billing/plan-comparison";
import type { PublicPlan } from "@/lib/repositories/billing/billing.repository";

function plan(
  code: PublicPlan["code"],
  name: string,
  sortOrder: number,
  caps: Partial<PublicPlan["features"]["capabilities"]>,
): PublicPlan {
  return {
    code,
    name,
    sortOrder,
    features: {
      capabilities: {
        stock: false,
        sales: false,
        catalog: false,
        insights: false,
        pay: false,
        staff: false,
        expenses: false,
        organization: false,
        ...caps,
      },
      limits: { products: 10, salesTransactions: 10, categories: 10, staffUsers: 1, branches: 1 },
    },
    prices: { monthly: { amountCents: 50000, currency: "ZMW" } },
  } as PublicPlan;
}

const plans = [
  plan("free", "Free", 1, { stock: true, sales: true }),
  plan("pro", "Pro", 3, { stock: true, sales: true, insights: true }),
  plan("enterprise", "Enterprise", 4, { stock: true, sales: true, insights: true, pay: true }),
];

function markup() {
  return renderToStaticMarkup(<PlanComparisonTable comparison={buildPlanComparison(plans)} />);
}

describe("PlanComparisonTable", () => {
  it("renders a column for every plan, Enterprise included", () => {
    const html = markup();
    expect(html).toContain("Free");
    expect(html).toContain("Pro");
    expect(html).toContain("Enterprise");
  });

  it("shows both a tick and an explicit dash, so absence is stated", () => {
    const html = markup();
    expect(html).toContain("Included");
    expect(html).toContain("Not included");
  });

  it("names every capability and limit", () => {
    const html = markup();
    for (const label of ["Aura Stock", "Aura Insights", "Aura Pay", "Expenses", "Products", "Branches"]) {
      expect(html).toContain(label);
    }
  });

  it("explains what each row means rather than listing bare feature names", () => {
    expect(markup()).toContain("Demand forecasts and risk signals");
  });

  // The landing renders this server-side from live plan data; an empty result
  // must not blow up the page.
  it("renders nothing when there are no plans", () => {
    expect(
      renderToStaticMarkup(<PlanComparisonTable comparison={buildPlanComparison([])} />),
    ).toBe("");
  });
});
