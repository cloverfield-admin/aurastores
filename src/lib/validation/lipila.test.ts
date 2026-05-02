import { describe, expect, it } from "vitest";
import {
  lipilaPaymentCallbackSchema,
  normalizeLipilaStatus,
  normalizeLipilaZambiaMsisdn,
  zambiaLipilaMsisdnSchema,
} from "@/lib/validation/lipila";

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

describe("zambiaLipilaMsisdnSchema", () => {
  it("accepts 260 plus 9 digits", () => {
    expect(zambiaLipilaMsisdnSchema.parse("260977000000")).toBe("260977000000");
  });

  it("strips +, spaces, and hyphens then validates", () => {
    expect(zambiaLipilaMsisdnSchema.parse("+260 977-000-000")).toBe("260977000000");
    expect(normalizeLipilaZambiaMsisdn("  +260 97 700 00 00 ")).toBe("260977000000");
  });

  it("rejects numbers that do not start with 260", () => {
    expect(zambiaLipilaMsisdnSchema.safeParse("0977000000").success).toBe(false);
    expect(zambiaLipilaMsisdnSchema.safeParse("977000000").success).toBe(false);
  });

  it("rejects wrong length", () => {
    expect(zambiaLipilaMsisdnSchema.safeParse("26097700000").success).toBe(false);
    expect(zambiaLipilaMsisdnSchema.safeParse("2609770000000").success).toBe(false);
  });
});
