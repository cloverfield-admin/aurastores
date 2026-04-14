"use client";

import Link from "next/link";
import { useState } from "react";
import { AuraAvatar } from "@/components/ui/aura-avatar";
import { apiUrl } from "@/lib/api/version";
import { ROUTES } from "@/lib/routes";
import { formatMembershipRole } from "@/lib/membership-display";
import type { AuthContext } from "@/lib/repositories/auth/auth.repository";

type UserProfileSettingsContentProps = {
  context: AuthContext;
};

type Theme = "light" | "dark" | "system";

export function UserProfileSettingsContent({ context }: UserProfileSettingsContentProps) {
  const { user, membership } = context;
  const [theme, setTheme] = useState<Theme>("light");
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [twoFactor, setTwoFactor] = useState(true);

  return (
    <div className="px-4 pb-16 pt-5 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1280px] space-y-10">
        {/* Page header — matches Figma */}
        <div className="space-y-2">
          <h1 className="font-[family-name:var(--font-manrope)] text-[30px] font-extrabold leading-9 tracking-[-0.75px] text-[#191c1e]">
            Settings & Profile
          </h1>
          <p className="text-base leading-6 text-[#3c4948]">
            Manage your clinical identity and application preferences.
          </p>
        </div>

        {/* Two-column grid: 8 cols left, 4 cols right */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-x-8 lg:gap-y-8">
          {/* Left column — Account Details + Security */}
          <div className="flex flex-col gap-8 lg:col-span-8">
            {/* Account Details card */}
            <section
              className="rounded-xl border border-[rgba(187,201,199,0.1)] bg-white p-[33px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
              aria-labelledby="account-details-heading"
            >
              <h2
                id="account-details-heading"
                className="mb-8 flex items-center gap-2 font-[family-name:var(--font-manrope)] text-xl font-bold text-[#191c1e]"
              >
                <span className="material-symbols-outlined notranslate text-xl text-[#006a65]">
                  person
                </span>
                Account Details
              </h2>
              <div className="flex flex-col gap-10 sm:flex-row sm:gap-10">
                <div className="flex flex-col items-start gap-3">
                  <div
                    className="relative size-[128px] overflow-hidden rounded-2xl p-1"
                    style={{
                      background: "linear-gradient(135deg, rgb(15, 185, 177) 0%, rgb(99, 102, 241) 100%)",
                    }}
                  >
                    <div className="relative size-full overflow-hidden rounded-xl bg-white">
                      <AuraAvatar
                        name={user.fullName}
                        className="size-full rounded-xl"
                        textClassName="text-4xl"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="text-[10px] font-semibold uppercase tracking-[1px] text-[#94a3b8] hover:text-[#64748b]"
                  >
                    Update Photo
                  </button>
                </div>
                <div className="grid min-w-0 flex-1 grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="relative">
                    <label className="absolute left-1 top-[7px] text-[10px] font-semibold uppercase tracking-[0.5px] text-[#006a65]">
                      Full Name
                    </label>
                    <div className="mt-[19px] rounded-lg bg-[#f2f4f6] px-3 py-3">
                      <p className="text-base font-medium leading-6 text-[#191c1e]">{user.fullName}</p>
                    </div>
                  </div>
                  <div className="relative">
                    <label className="absolute left-1 top-[7px] text-[10px] font-semibold uppercase tracking-[0.5px] text-[#006a65]">
                      Role
                    </label>
                    <div className="mt-[19px] rounded-lg bg-[rgba(230,232,234,0.5)] px-3 py-3">
                      <p className="text-base font-medium leading-6 text-[#3c4948]">
                        {formatMembershipRole(membership.role)}
                      </p>
                    </div>
                  </div>
                  <div className="relative sm:col-span-2">
                    <label className="absolute left-1 top-[7px] text-[10px] font-semibold uppercase tracking-[0.5px] text-[#006a65]">
                      Email Address
                    </label>
                    <div className="mt-[19px] rounded-lg bg-[#f2f4f6] px-3 py-3">
                      <p className="text-base font-medium leading-6 text-[#191c1e]">{user.email}</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Security Settings card */}
            <section
              className="rounded-xl border border-[rgba(187,201,199,0.1)] bg-white p-[33px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
              aria-labelledby="security-heading"
            >
              <h2
                id="security-heading"
                className="mb-8 flex items-center gap-2 font-[family-name:var(--font-manrope)] text-xl font-bold text-[#191c1e]"
              >
                <span className="material-symbols-outlined notranslate text-xl text-[#006a65]">
                  lock
                </span>
                Security Settings
              </h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div className="relative">
                  <label className="absolute left-1 top-[7px] text-[10px] font-semibold uppercase tracking-[0.5px] text-[#64748b]">
                    Current Password
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="mt-[19px] w-full rounded-lg bg-[#f2f4f6] px-3 py-3.5 text-base text-[#6b7280] placeholder:text-[#6b7280]"
                  />
                </div>
                <div className="relative">
                  <label className="absolute left-1 top-[7px] text-[10px] font-semibold uppercase tracking-[0.5px] text-[#64748b]">
                    New Password
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="mt-[19px] w-full rounded-lg bg-[#f2f4f6] px-3 py-3.5 text-base text-[#6b7280] placeholder:text-[#6b7280]"
                  />
                </div>
                <div className="relative">
                  <label className="absolute left-1 top-[7px] text-[10px] font-semibold uppercase tracking-[0.5px] text-[#64748b]">
                    Confirm New
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="mt-[19px] w-full rounded-lg bg-[#f2f4f6] px-3 py-3.5 text-base text-[#6b7280] placeholder:text-[#6b7280]"
                  />
                </div>
              </div>
              {/* 2FA banner */}
              <div className="mt-8 rounded-xl border border-[rgba(0,106,101,0.1)] bg-[rgba(0,106,101,0.05)] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex size-12 items-center justify-center rounded-full bg-white shadow-sm">
                      <span className="material-symbols-outlined notranslate text-xl text-[#006a65]">
                        shield
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#191c1e]">
                        Two-Factor Authentication
                      </p>
                      <p className="mt-0.5 text-xs text-[#3c4948]">
                        Secure your clinical account with a second layer of protection.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={twoFactor}
                    onClick={() => setTwoFactor(!twoFactor)}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                      twoFactor ? "bg-[#006a65]" : "bg-[#e2e8f0]"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 size-5 rounded-full border-2 border-white bg-white shadow transition-all ${
                        twoFactor ? "left-[22px]" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </section>
          </div>

          {/* Right column — Appearance + Preferences + Actions */}
          <div className="flex flex-col gap-8 lg:col-span-4 lg:pb-14">
            {/* Appearance card */}
            <section
              className="rounded-xl border border-[rgba(187,201,199,0.1)] bg-white p-6 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
              aria-labelledby="appearance-heading"
            >
              <h2
                id="appearance-heading"
                className="mb-6 flex items-center gap-2 font-[family-name:var(--font-manrope)] text-lg font-bold text-[#191c1e]"
              >
                <span className="material-symbols-outlined notranslate text-xl text-[#006a65]">
                  palette
                </span>
                Appearance
              </h2>
              <div className="grid grid-cols-3 gap-3">
                {(["light", "dark", "system"] as const).map((t) => {
                  const selected = theme === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTheme(t)}
                      className={`flex flex-col items-center gap-2 ${
                        selected ? "" : "opacity-60"
                      }`}
                    >
                      <div
                        className={`w-full rounded-lg p-2 ${
                          t === "light"
                            ? `border-2 ${selected ? "border-[#006a65]" : "border-transparent"} bg-[#f1f5f9]`
                            : t === "dark"
                              ? `border-2 ${selected ? "border-[#006a65]" : "border-transparent"} bg-[#1e293b]`
                              : `border-2 ${selected ? "border-[#006a65]" : "border-transparent"}`
                        }`}
                        style={
                          t === "system"
                            ? {
                                background:
                                  "linear-gradient(123deg, rgb(241, 245, 249) 0%, rgb(30, 41, 59) 100%)",
                              }
                            : undefined
                        }
                      >
                      {t === "light" && (
                        <div className="space-y-1 rounded bg-white p-1 shadow-sm">
                          <div className="h-1.5 w-full rounded-full bg-[#f1f5f9]" />
                          <div className="h-1.5 w-[60%] rounded-full bg-[#f1f5f9]" />
                        </div>
                      )}
                      {t === "dark" && (
                        <div className="space-y-1 rounded bg-[#0f172a] p-1">
                          <div className="h-1.5 w-full rounded-full bg-[#334155]" />
                          <div className="h-1.5 w-[70%] rounded-full bg-[#334155]" />
                        </div>
                      )}
                      {t === "system" && (
                        <div className="h-14 rounded bg-white/20 backdrop-blur" />
                      )}
                    </div>
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-[1px] ${
                          selected ? "text-[#006a65]" : "text-[#64748b]"
                        }`}
                      >
                        {t === "light" ? "Light" : t === "dark" ? "Dark" : "System"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Preferences card */}
            <section
              className="rounded-xl border border-[rgba(187,201,199,0.1)] bg-white p-6 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
              aria-labelledby="preferences-heading"
            >
              <h2
                id="preferences-heading"
                className="mb-6 flex items-center gap-2 font-[family-name:var(--font-manrope)] text-lg font-bold text-[#191c1e]"
              >
                <span className="material-symbols-outlined notranslate text-xl text-[#006a65]">
                  notifications
                </span>
                Preferences
              </h2>
              <div className="space-y-6">
                {[
                  {
                    label: "Email Alerts",
                    sub: "Weekly report summaries",
                    value: emailAlerts,
                    set: setEmailAlerts,
                  },
                  {
                    label: "SMS Alerts",
                    sub: "Critical stock levels",
                    value: smsAlerts,
                    set: setSmsAlerts,
                  },
                  {
                    label: "Push Notifications",
                    sub: "Immediate record updates",
                    value: pushNotifications,
                    set: setPushNotifications,
                  },
                ].map(({ label, sub, value, set }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#191c1e]">{label}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-[-0.25px] text-[#64748b]">
                        {sub}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={value}
                      onClick={() => set(!value)}
                      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                        value ? "bg-[#006a65]" : "bg-[#e2e8f0]"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 size-4 rounded-full border border-white bg-white transition-all ${
                          value ? "left-[18px] border-white" : "left-0.5 border-[#d1d5db]"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* Action bar */}
            <div className="flex gap-4">
              <Link
                href={ROUTES.dashboard.main}
                className="flex flex-1 items-center justify-center rounded-xl bg-[#e0e3e5] py-3 text-base font-semibold text-[#191c1e] transition hover:bg-[#d1d5db]"
              >
                Cancel
              </Link>
              <button
                type="button"
                className="flex flex-1 items-center justify-center rounded-xl py-3 text-base font-semibold text-white shadow-[0px_10px_15px_-3px_rgba(0,106,101,0.2),0px_4px_6px_-4px_rgba(0,106,101,0.2)] transition hover:opacity-95"
                style={{
                  background:
                    "linear-gradient(135deg, rgb(15, 185, 177) 0%, rgb(99, 102, 241) 100%)",
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>

        {/* Recent Activity Log — full width */}
        <section
          className="rounded-2xl border border-[rgba(187,201,199,0.05)] bg-[#f2f4f6] px-8 py-10"
          aria-labelledby="activity-heading"
        >
          <h2
            id="activity-heading"
            className="mb-6 text-[11px] font-semibold uppercase tracking-[1.1px] text-[#006a65]"
          >
            Recent Activity Log
          </h2>
          <div className="relative pl-12">
            <div
              className="absolute left-6 top-0 bottom-0 w-px opacity-30"
              style={{
                background:
                  "linear-gradient(135deg, rgb(15, 185, 177) 0%, rgb(99, 102, 241) 100%)",
              }}
            />
            <div className="space-y-8">
              <div className="flex gap-6">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-[#006a65] bg-white shadow-sm">
                  <span className="material-symbols-outlined notranslate text-lg text-[#006a65]">
                    shield
                  </span>
                </div>
                <div className="min-w-0 flex-1 pt-1">
                  <p className="text-sm font-semibold text-[#191c1e]">Password Updated</p>
                  <p className="mt-1 text-xs text-[#3c4948]">
                    The account password was changed successfully from a verified device.
                  </p>
                  <p className="mt-1 text-[10px] font-semibold uppercase text-[#94a3b8]">
                    Today, 09:42 AM
                  </p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-[#4648d4] bg-white shadow-sm">
                  <span className="material-symbols-outlined notranslate text-lg text-[#4648d4]">
                    login
                  </span>
                </div>
                <div className="min-w-0 flex-1 pt-1">
                  <p className="text-sm font-semibold text-[#191c1e]">New Session Detected</p>
                  <p className="mt-1 text-xs text-[#3c4948]">
                    Logged in from Safari on MacOS High Sierra (Clinical Workstation 04).
                  </p>
                  <p className="mt-1 text-[10px] font-semibold uppercase text-[#94a3b8]">
                    Yesterday, 02:15 PM
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Sign out — at bottom, Figma has it in sidebar but we use dashboard sidebar */}
        <div className="border-t border-[#f1f5f9] pt-6">
          <Link
            href={apiUrl("/auth/sign-out")}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#64748b] transition hover:text-[#dc2626]"
          >
            <span className="material-symbols-outlined notranslate text-xl">logout</span>
            Sign out
          </Link>
        </div>
      </div>
    </div>
  );
}
