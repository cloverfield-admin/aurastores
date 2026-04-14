import { describe, expect, it } from "vitest";
import { updateStaffMemberSchema } from "@/lib/validation/staff";

describe("updateStaffMemberSchema", () => {
  const validBase = {
    fullName: "Jane Doe",
    phone: "+15551234567",
    jobTitle: null,
    appRole: "cashier" as const,
    capabilities: { stock: true, sales: true },
    branchIds: ["550e8400-e29b-41d4-a716-446655440000"],
  };

  it("accepts a valid payload", () => {
    const r = updateStaffMemberSchema.safeParse(validBase);
    expect(r.success).toBe(true);
  });

  it("rejects unknown keys such as email", () => {
    const r = updateStaffMemberSchema.safeParse({
      ...validBase,
      email: "evil@example.com",
    });
    expect(r.success).toBe(false);
  });

  it("requires at least one branch", () => {
    const r = updateStaffMemberSchema.safeParse({
      ...validBase,
      branchIds: [],
    });
    expect(r.success).toBe(false);
  });

  it("normalizes empty phone to null", () => {
    const r = updateStaffMemberSchema.safeParse({
      ...validBase,
      phone: "   ",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.phone).toBe(null);
    }
  });
});
