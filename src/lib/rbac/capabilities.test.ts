import { describe, expect, it } from "vitest";
import {
  defaultCapabilitiesForAppRole,
  hasCapability,
  membershipCapabilityLabel,
  mergeCapabilitiesFromInput,
  normalizeStoredCapabilities,
} from "@/lib/rbac/capabilities";

describe("membershipCapabilityLabel", () => {
  it("returns user-facing labels for each capability", () => {
    expect(membershipCapabilityLabel("insights")).toContain("Insights");
    expect(membershipCapabilityLabel("stock")).toContain("Stock");
  });
});

describe("defaultCapabilitiesForAppRole", () => {
  it("grants all modules for owner and admin", () => {
    const owner = defaultCapabilitiesForAppRole("owner");
    expect(Object.values(owner).every(Boolean)).toBe(true);
    const admin = defaultCapabilitiesForAppRole("admin");
    expect(Object.values(admin).every(Boolean)).toBe(true);
  });

  it("restricts staff and organization management for pharmacist", () => {
    const p = defaultCapabilitiesForAppRole("pharmacist");
    expect(p.stock && p.sales && p.catalog).toBe(true);
    expect(p.staff || p.organization).toBe(false);
  });
});

describe("mergeCapabilitiesFromInput", () => {
  it("overrides defaults when partial is provided", () => {
    const merged = mergeCapabilitiesFromInput("pharmacist", { staff: true, organization: true });
    expect(merged.staff).toBe(true);
    expect(merged.organization).toBe(true);
    expect(merged.stock).toBe(true);
  });

  it("maps legacy settings flag to organization", () => {
    const merged = mergeCapabilitiesFromInput("pharmacist", { staff: true, settings: true } as never);
    expect(merged.organization).toBe(true);
  });
});

describe("normalizeStoredCapabilities", () => {
  it("falls back to role defaults when raw is null", () => {
    const n = normalizeStoredCapabilities(null, "cashier");
    expect(n.sales).toBe(true);
    expect(n.insights).toBe(false);
  });

  it("maps legacy settings JSON to organization", () => {
    const n = normalizeStoredCapabilities({ settings: true, stock: true }, "pharmacist");
    expect(n.organization).toBe(true);
    expect(n.stock).toBe(true);
  });
});

describe("hasCapability", () => {
  it("reads boolean flags", () => {
    const caps = defaultCapabilitiesForAppRole("analyst");
    expect(hasCapability(caps, "insights")).toBe(true);
    expect(hasCapability(caps, "stock")).toBe(false);
  });
});
