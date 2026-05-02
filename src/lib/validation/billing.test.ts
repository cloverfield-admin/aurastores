import { describe, expect, it } from "vitest";
import {
  createInvoiceSchema,
  lipilaCallbackSchema,
  startIntroPaidTrialSchema,
  startLipilaCardCollectionSchema,
  startLipilaMomoCollectionSchema,
  updatePlanPriceSchema,
} from "@/lib/validation/billing";

describe("createInvoiceSchema", () => {
  it("accepts a valid invoice request", () => {
    expect(createInvoiceSchema.parse({ planCode: "basic", interval: "monthly" })).toEqual({
      planCode: "basic",
      interval: "monthly",
    });
  });
});

describe("startIntroPaidTrialSchema", () => {
  it("accepts basic, pro, and enterprise", () => {
    expect(startIntroPaidTrialSchema.parse({ planCode: "enterprise" })).toEqual({ planCode: "enterprise" });
  });

  it("rejects free", () => {
    expect(startIntroPaidTrialSchema.safeParse({ planCode: "free" }).success).toBe(false);
  });
});

describe("updatePlanPriceSchema", () => {
  it("coerces amountCents and validates", () => {
    const v = updatePlanPriceSchema.parse({
      planCode: "pro",
      interval: "yearly",
      currency: "ZMW",
      amountCents: "600000",
    });
    expect(v.amountCents).toBe(600000);
  });
});

describe("lipilaCallbackSchema", () => {
  it("accepts partial payloads (identifier required by handler, not schema)", () => {
    expect(
      lipilaCallbackSchema.parse({
        identifier: "inv_x",
        status: "Successful",
        referenceId: "8017bfe9-d62b-4abb-b711-1690792e6efe",
      }).identifier,
    ).toBe("inv_x");
  });
});

describe("startLipilaMomoCollectionSchema", () => {
  it("accepts a momo start payload", () => {
    expect(
      startLipilaMomoCollectionSchema.parse({
        invoiceId: "b4c9a8f1-7c4d-4b3e-bc8a-5d9e2b15f7a1",
        msisdn: "260977000000",
        network: "AirtelMoney",
      }),
    ).toEqual({
      invoiceId: "b4c9a8f1-7c4d-4b3e-bc8a-5d9e2b15f7a1",
      msisdn: "260977000000",
      network: "AirtelMoney",
    });
  });

  it("normalizes msisdn to 260XXXXXXXXX", () => {
    const parsed = startLipilaMomoCollectionSchema.parse({
      invoiceId: "b4c9a8f1-7c4d-4b3e-bc8a-5d9e2b15f7a1",
      msisdn: "+260 977-000-000",
    });
    expect(parsed.msisdn).toBe("260977000000");
  });
});

describe("startLipilaCardCollectionSchema", () => {
  it("accepts a card start payload", () => {
    expect(
      startLipilaCardCollectionSchema.parse({
        invoiceId: "b4c9a8f1-7c4d-4b3e-bc8a-5d9e2b15f7a1",
        returnUrl: "https://example.com/dashboard/settings/billing",
      }),
    ).toEqual({
      invoiceId: "b4c9a8f1-7c4d-4b3e-bc8a-5d9e2b15f7a1",
      returnUrl: "https://example.com/dashboard/settings/billing",
    });
  });
});

