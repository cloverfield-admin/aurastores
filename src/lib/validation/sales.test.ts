import { describe, expect, it } from "vitest";
import { startSaleMobileMoneySchema } from "@/lib/validation/sales";

const sale = {
  branchId: "b4c9a8f1-7c4d-4b3e-bc8a-5d9e2b15f7a1",
  customerName: "Ada Customer",
  mobile: "260977000000",
  discountCode: "",
  notes: "",
  items: [
    {
      productId: "7e9f87ea-01f5-44e4-9df4-88ebf0cc0c38",
      batchId: "1d1e6d86-c099-469a-9a2d-5580c43d6fc1",
      quantity: 1,
      unitPrice: 10,
      description: "Paracetamol",
    },
  ],
};

describe("startSaleMobileMoneySchema", () => {
  it("accepts a completed mobile money sale start payload", () => {
    const parsed = startSaleMobileMoneySchema.parse({
      sale,
      mobileMoneyNumber: "260977000000",
    });

    expect(parsed.mobileMoneyNumber).toBe("260977000000");
    expect(parsed.customerPaysLipilaFee).toBe(false);
    expect(parsed.sale.items).toHaveLength(1);
  });

  it("accepts customer fee consent flag", () => {
    const parsed = startSaleMobileMoneySchema.parse({
      sale,
      mobileMoneyNumber: "260977000000",
      customerPaysLipilaFee: true,
    });

    expect(parsed.customerPaysLipilaFee).toBe(true);
  });

  it("rejects short mobile money numbers", () => {
    expect(
      startSaleMobileMoneySchema.safeParse({
        sale,
        mobileMoneyNumber: "123",
      }).success,
    ).toBe(false);
  });
});
