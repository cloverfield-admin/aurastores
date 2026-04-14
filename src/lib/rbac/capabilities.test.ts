import { describe, expect, it } from "vitest";
import {
  defaultCapabilitiesForAppRole,
  hasCapability,
  mergeCapabilitiesFromInput,
  normalizeStoredCapabilities,
} from "@/lib/rbac/capabilities";

describe("defaultCapabilitiesForAppRole", () => {
  it("grants all modules for owner and admin", () => {
    const owner = defaultCapabilitiesForAppRole("owner");
    expect(Object.values(owner).every(Boolean)).toBe(true);
    const admin = defaultCapabilitiesForAppRole("admin");
    expect(Object.values(admin).every(Boolean)).toBe(true);
  });

  it("restricts staff and settings for pharmacist", () => {
    const p = defaultCapabilitiesForAppRole("pharmacist");
    expect(p.stock && p.sales && p.catalog).toBe(true);
    expect(p.staff || p.settings).toBe(false);
  });
});

describe("mergeCapabilitiesFromInput", () => {
  it("overrides defaults when partial is provided", () => {
    const merged = mergeCapabilitiesFromInput("pharmacist", { staff: true, settings: true });
    expect(merged.staff).toBe(true);
    expect(merged.settings).toBe(true);
    expect(merged.stock).toBe(true);
  });
});

describe("normalizeStoredCapabilities", () => {
  it("falls back to role defaults when raw is null", () => {
    const n = normalizeStoredCapabilities(null, "cashier");
    expect(n.sales).toBe(true);
    expect(n.insights).toBe(false);
  });
});

describe("hasCapability", () => {
  it("reads boolean flags", () => {
    const caps = defaultCapabilitiesForAppRole("analyst");
    expect(hasCapability(caps, "insights")).toBe(true);
    expect(hasCapability(caps, "stock")).toBe(false);
  });
});
