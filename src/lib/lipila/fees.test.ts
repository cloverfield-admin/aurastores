import { describe, expect, it } from "vitest";
import { calculateCollectionFee, calculateDisbursementFee } from "@/lib/lipila/fees";

describe("Lipila fee calculations", () => {
  it("calculates collection fee when merchant absorbs fees", () => {
    const fee = calculateCollectionFee({ saleTotalCents: 10_000, customerPaysFee: false });
    expect(fee.grossAmountCents).toBe(10_000);
    expect(fee.feeBps).toBe(250);
    expect(fee.feePayer).toBe("merchant");
    expect(fee.feeCents).toBeGreaterThan(0);
    expect(fee.netAmountCents).toBe(10_000 - fee.feeCents);
  });

  it("grosses-up collection amount when customer covers fees", () => {
    const fee = calculateCollectionFee({ saleTotalCents: 10_000, customerPaysFee: true });
    expect(fee.netAmountCents).toBe(10_000);
    expect(fee.feeBps).toBe(250);
    expect(fee.feePayer).toBe("customer");
    expect(fee.grossAmountCents).toBeGreaterThan(10_000);
    expect(fee.feeCents).toBe(fee.grossAmountCents - 10_000);
  });

  it("calculates disbursement fee and total wallet debit", () => {
    const fee = calculateDisbursementFee({ payoutAmountCents: 10_000 });
    expect(fee.payoutAmountCents).toBe(10_000);
    expect(fee.feeBps).toBe(150);
    expect(fee.feePayer).toBe("wallet");
    expect(fee.totalDebitCents).toBe(10_000 + fee.feeCents);
    expect(fee.netAmountCents).toBe(fee.totalDebitCents);
  });
});

