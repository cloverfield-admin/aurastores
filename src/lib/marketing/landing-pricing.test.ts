import { describe, expect, it } from "vitest";
import { buildLandingPlans } from "@/lib/marketing/landing-pricing";
import type { PublicPlan } from "@/lib/repositories/billing/billing.repository";

function plan(code: PublicPlan["code"], name: string, sortOrder: number, monthly: number, yearly: number | null): PublicPlan {
  return {
    code,
    name,
    sortOrder,
    features: {
      capabilities: { stock: true, sales: true, catalog: true, insights: false, pay: false, staff: false, expenses: false, organization: true },
      limits: { products: 50, salesTransactions: 100, categories: 20, staffUsers: 1, branches: 1 },
    },
    prices: {
      monthly: { amountCents: monthly, currency: "ZMW" },
      ...(yearly == null ? {} : { yearly: { amountCents: yearly, currency: "ZMW" } }),
    },
  } as PublicPlan;
}

describe("buildLandingPlans annual saving", () => {
  // drizzle/0059: pay for ten. The note and the toggle badge both read from this.
  it("says what annual saves when it saves something", () => {
    const [basic] = buildLandingPlans([plan("basic", "Basic", 2, 30_000, 300_000)]);
    expect(basic.yearlyMonthsFree).toBe(2);
    expect(basic.yearlyNote).toBe("Billed annually · 2 months free");
  });

  // The pre-0059 state, and what any fresh database still shows until the
  // migration runs: no claim of a saving that does not exist.
  it("falls back to the plain note at exactly 12× monthly", () => {
    const [pro] = buildLandingPlans([plan("pro", "Pro", 3, 50_000, 600_000)]);
    expect(pro.yearlyMonthsFree).toBeNull();
    expect(pro.yearlyNote).toBe("Billed annually · 12 months upfront");
  });

  it("never claims a saving on Free", () => {
    const [free] = buildLandingPlans([plan("free", "Free", 1, 0, 0)]);
    expect(free.yearlyMonthsFree).toBeNull();
    expect(free.yearlyNote).toBe("Free forever · no card required");
  });
});

describe("buildLandingPlans bullets", () => {
  // The cards' own capability list omitted these two, so a Pro card never
  // said "Expenses" and no card ever mentioned the catalogue.
  it("can now name catalog and expenses", () => {
    const free = plan("free", "Free", 1, 0, 0);
    const pro = {
      ...plan("pro", "Pro", 3, 50_000, 500_000),
      features: {
        capabilities: { stock: true, sales: true, catalog: true, insights: true, pay: true, staff: true, expenses: true, organization: true },
        limits: { products: null, salesTransactions: null, categories: null, staffUsers: 15, branches: 15 },
      },
    } as PublicPlan;

    const [freeCard, proCard] = buildLandingPlans([free, pro]);
    expect(freeCard.bullets).toContain("Products & categories");
    expect(proCard.bullets).toContain("Expenses");
  });
});
