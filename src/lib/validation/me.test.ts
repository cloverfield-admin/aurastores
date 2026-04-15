import { describe, expect, it } from "vitest";
import {
  changePasswordSchema,
  patchMeSchema,
  patchUserPreferencesSchema,
  userPreferencesSchema,
} from "@/lib/validation/me";

describe("userPreferencesSchema", () => {
  it("accepts a full valid object", () => {
    const v = userPreferencesSchema.parse({
      theme: "system",
      emailAlerts: false,
      smsAlerts: true,
      pushNotifications: true,
    });
    expect(v.theme).toBe("system");
  });

  it("rejects invalid theme", () => {
    expect(() =>
      userPreferencesSchema.parse({
        theme: "neon",
        emailAlerts: true,
        smsAlerts: true,
        pushNotifications: false,
      }),
    ).toThrow();
  });
});

describe("patchUserPreferencesSchema", () => {
  it("allows partial updates", () => {
    expect(patchUserPreferencesSchema.parse({ theme: "dark" })).toEqual({ theme: "dark" });
  });
});

describe("patchMeSchema", () => {
  it("accepts fullName only", () => {
    expect(patchMeSchema.parse({ fullName: "Dr. Jane Doe" })).toEqual({ fullName: "Dr. Jane Doe" });
  });

  it("accepts preferences only", () => {
    expect(patchMeSchema.parse({ theme: "dark" })).toEqual({ theme: "dark" });
  });

  it("rejects empty body", () => {
    expect(() => patchMeSchema.parse({})).toThrow();
  });
});

describe("changePasswordSchema", () => {
  it("requires non-empty current password and strong new password", () => {
    const ok = changePasswordSchema.parse({
      currentPassword: "oldpass1",
      newPassword: "newpass12",
    });
    expect(ok.newPassword).toBe("newpass12");
  });

  it("rejects short new password", () => {
    expect(() =>
      changePasswordSchema.parse({ currentPassword: "x", newPassword: "short" }),
    ).toThrow();
  });
});
