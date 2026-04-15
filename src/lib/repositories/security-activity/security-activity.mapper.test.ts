import { describe, expect, it } from "vitest";
import { mapAuditActionToUiItem } from "@/lib/repositories/security-activity/security-activity.mapper";

describe("mapAuditActionToUiItem", () => {
  it("maps user_updated_password", () => {
    const item = mapAuditActionToUiItem({
      rowId: "1",
      payload: { action: "user_updated_password" },
      createdAt: new Date("2026-01-15T10:00:00.000Z"),
      ipAddress: null,
    });
    expect(item.title).toBe("Password updated");
    expect(item.icon).toBe("shield");
  });

  it("maps login with provider", () => {
    const item = mapAuditActionToUiItem({
      rowId: "2",
      payload: {
        action: "login",
        metadata: { provider: "email" },
        ip_address: "203.0.113.1",
      },
      createdAt: "2026-01-14T12:00:00.000Z",
      ipAddress: null,
    });
    expect(item.title).toBe("Sign-in");
    expect(item.description).toContain("email");
    expect(item.description).toContain("203.0.113.1");
  });
});
