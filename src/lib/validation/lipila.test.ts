import { describe, expect, it } from "vitest";
import { lipilaPaymentCallbackSchema, normalizeLipilaStatus } from "@/lib/validation/lipila";

describe("lipilaPaymentCallbackSchema", () => {
  it("accepts collection and disbursement callback fields", () => {
    const parsed = lipilaPaymentCallbackSchema.parse({
      referenceId: "sale_momo_abc",
      amount: 10,
      currency: "ZMW",
      accountNumber: "260977000000",
      status: "Successful",
      type: "Collection",
      identifier: "LPLTXNCAM-1",
      externalId: "MP1",
    });

    expect(parsed.referenceId).toBe("sale_momo_abc");
    expect(parsed.status).toBe("Successful");
  });
});

describe("normalizeLipilaStatus", () => {
  it("normalizes terminal statuses", () => {
    expect(normalizeLipilaStatus("Successful")).toBe("successful");
    expect(normalizeLipilaStatus("Failed")).toBe("failed");
    expect(normalizeLipilaStatus("Pending")).toBe("pending");
  });
});
