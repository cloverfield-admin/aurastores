"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useMemo, useRef, useState } from "react";
import { AuraAvatar } from "@/components/ui/aura-avatar";
import { AuraInlineAlert } from "@/components/ui/aura-inline-alert";
import { apiUrl } from "@/lib/api/version";
import type { MeResponse } from "@/lib/queries/me";
import {
  useChangePasswordMutation,
  useMeQuery,
  usePatchMeMutation,
  useSecurityActivityQuery,
  useUploadAvatarMutation,
} from "@/lib/queries/me";
import { ROUTES } from "@/lib/routes";
import { formatMembershipRole } from "@/lib/membership-display";
import type { AuthContext } from "@/lib/repositories/auth/auth.repository";
import type { PatchMeInput, UserPreferencesInput } from "@/lib/validation/me";

type UserProfileSettingsContentProps = {
  context: AuthContext;
  mePlaceholder: MeResponse;
};

function formatActivityWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (isToday) {
    return `Today, ${time}`;
  }
  const dayPart = d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  return `${dayPart}, ${time}`;
}

function activityIconGlyph(icon: string): string {
  switch (icon) {
    case "login":
      return "login";
    case "logout":
      return "logout";
    case "key":
      return "key";
    case "notifications":
      return "notifications";
    case "palette":
      return "palette";
    default:
      return "shield";
  }
}

function activityIconColor(icon: string): string {
  switch (icon) {
    case "login":
      return "#4648d4";
    case "logout":
      return "#64748b";
    case "key":
      return "#006a65";
    default:
      return "#006a65";
  }
}

export function UserProfileSettingsContent({ context, mePlaceholder }: UserProfileSettingsContentProps) {
  const { user, membership } = context;
  const router = useRouter();
  const me = useMeQuery(mePlaceholder);
  const activity = useSecurityActivityQuery();
  const patchMe = usePatchMeMutation();
  const uploadAvatar = useUploadAvatarMutation();
  const changePassword = useChangePasswordMutation();

  const remotePrefs = me.data?.preferences ?? mePlaceholder.preferences;
  const remoteFullName = me.data?.fullName ?? mePlaceholder.fullName;
  const avatarUrl = me.data?.avatarUrl ?? mePlaceholder.avatarUrl;

  const [fullNameOverride, setFullNameOverride] = useState<string | null>(null);
  const fullName = fullNameOverride !== null ? fullNameOverride : remoteFullName;

  const [localPrefsDelta, setLocalPrefsDelta] = useState<Partial<UserPreferencesInput>>({});
  const prefs = useMemo(
    () => ({ ...remotePrefs, ...localPrefsDelta }),
    [remotePrefs, localPrefsDelta],
  );

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputId = useId();

  const isSavingPrefs = patchMe.isPending;
  const isSavingPassword = changePassword.isPending;
  const isUploadingPhoto = uploadAvatar.isPending;

  async function handleSaveChanges() {
    setFormError(null);
    setFormSuccess(null);

    const nameTrimmed = fullName.trim();
    const nameChanged = nameTrimmed !== remoteFullName.trim();
    const prefsChanged = Object.keys(localPrefsDelta).length > 0;
    const wantsPassword =
      currentPassword.trim().length > 0 ||
      newPassword.trim().length > 0 ||
      confirmPassword.trim().length > 0;

    if (!nameChanged && !prefsChanged && !wantsPassword) {
      setFormSuccess("No changes to save.");
      return;
    }

    try {
      let savedProfile = false;

      if (nameChanged || prefsChanged) {
        const patch: PatchMeInput = {
          theme: prefs.theme,
          emailAlerts: prefs.emailAlerts,
          smsAlerts: prefs.smsAlerts,
          pushNotifications: prefs.pushNotifications,
        };
        if (nameChanged) {
          patch.fullName = nameTrimmed;
        }
        await patchMe.mutateAsync(patch);
        setLocalPrefsDelta({});
        setFullNameOverride(null);
        savedProfile = true;
      }

      if (wantsPassword) {
        if (!currentPassword || !newPassword || !confirmPassword) {
          setFormError("To change your password, fill in current, new, and confirm fields.");
          return;
        }
        if (newPassword !== confirmPassword) {
          setFormError("New password and confirmation do not match.");
          return;
        }
        await changePassword.mutateAsync({ currentPassword, newPassword });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }

      if (savedProfile || wantsPassword) {
        router.refresh();
      }

      if (wantsPassword && savedProfile) {
        setFormSuccess("Your profile, preferences, and password were saved.");
      } else if (wantsPassword) {
        setFormSuccess("Your password was saved.");
      } else {
        setFormSuccess("Your profile and preferences were saved.");
      }
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not save changes.");
    }
  }

  async function handleAvatarSelected(file: File | null) {
    if (!file) {
      return;
    }
    setFormError(null);
    setFormSuccess(null);
    try {
      await uploadAvatar.mutateAsync(file);
      router.refresh();
      setFormSuccess("Profile photo updated.");
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not upload photo.");
    }
  }

  return (
    <div className="px-4 pb-16 pt-5 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1280px] space-y-10">
        <div className="space-y-2">
          {/* <h1 className="font-[family-name:var(--font-manrope)] text-[30px] font-extrabold leading-9 tracking-[-0.75px] text-[#191c1e]">
            Settings & Profile
          </h1> */}
          <p className="text-base leading-6 text-[#3c4948]">
            Manage your identity and preferences.
          </p>
        </div>

        {formError ? (
          <AuraInlineAlert variant="error" title="Something went wrong" description={formError} />
        ) : null}
        {formSuccess ? (
          <AuraInlineAlert variant="success" title="Saved" description={formSuccess} />
        ) : null}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-x-8 lg:gap-y-8">
          <div className="flex flex-col gap-8 lg:col-span-8">
            <section
              className="rounded-xl border border-[rgba(187,201,199,0.1)] bg-white p-[33px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
              aria-labelledby="account-details-heading"
            >
              <h2
                id="account-details-heading"
                className="mb-8 flex items-center gap-2 font-[family-name:var(--font-manrope)] text-xl font-bold text-[#191c1e]"
              >
                <span className="material-symbols-outlined notranslate text-xl text-[#006a65]">person</span>
                Account Details
              </h2>
              <div className="flex flex-col gap-10 sm:flex-row sm:gap-10">
                <div className="flex flex-col items-start gap-3">
                  <input
                    id={photoInputId}
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      void handleAvatarSelected(f);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    disabled={isUploadingPhoto}
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Change profile photo"
                    className="group relative size-[128px] shrink-0 overflow-hidden rounded-2xl p-1 text-left transition-opacity hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006a65] disabled:cursor-not-allowed disabled:opacity-50"
                    style={{
                      background: "linear-gradient(135deg, rgb(15, 185, 177) 0%, rgb(99, 102, 241) 100%)",
                    }}
                  >
                    <div className="relative size-full overflow-hidden rounded-xl bg-white">
                      <AuraAvatar
                        name={fullName}
                        photoUrl={avatarUrl}
                        className="size-full rounded-xl"
                        textClassName="text-4xl"
                      />
                    </div>
                    <span className="pointer-events-none absolute inset-0 flex items-end justify-center rounded-xl bg-gradient-to-t from-black/35 to-transparent pb-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-white drop-shadow-sm">
                        Change
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="text-[10px] font-semibold uppercase tracking-[1px] text-[#94a3b8] hover:text-[#64748b] disabled:opacity-50"
                    disabled={isUploadingPhoto}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {isUploadingPhoto ? "Uploading…" : "Update Photo"}
                  </button>
                </div>
                <div className="grid min-w-0 flex-1 grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="relative">
                    <label
                      htmlFor="settings-full-name"
                      className="absolute left-1 top-[7px] text-[10px] font-semibold uppercase tracking-[0.5px] text-[#006a65]"
                    >
                      Full Name
                    </label>
                    <input
                      id="settings-full-name"
                      type="text"
                      autoComplete="name"
                      value={fullName}
                      onChange={(e) => setFullNameOverride(e.target.value)}
                      className="mt-[19px] w-full rounded-lg border-0 bg-[#f2f4f6] px-3 py-3 text-base font-medium leading-6 text-[#191c1e] outline-none ring-0 placeholder:text-[#6b7280] focus:bg-[#e8eaed]"
                    />
                  </div>
                  <div className="relative">
                    <label className="absolute left-1 top-[7px] text-[10px] font-semibold uppercase tracking-[0.5px] text-[#64748b]">
                      Role
                    </label>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={formatMembershipRole(membership.role)}
                      className="mt-[19px] w-full cursor-not-allowed rounded-lg border-0 bg-[rgba(230,232,234,0.5)] px-3 py-3 text-base font-medium leading-6 text-[#3c4948]"
                      aria-label="Role (cannot be changed here)"
                    />
                  </div>
                  <div className="relative sm:col-span-2">
                    <label className="absolute left-1 top-[7px] text-[10px] font-semibold uppercase tracking-[0.5px] text-[#64748b]">
                      Email Address
                    </label>
                    <input
                      type="email"
                      readOnly
                      disabled
                      value={user.email}
                      className="mt-[19px] w-full cursor-not-allowed rounded-lg border-0 bg-[#f2f4f6] px-3 py-3 text-base font-medium leading-6 text-[#191c1e]"
                      aria-label="Email (cannot be changed here)"
                    />
                  </div>
                </div>
              </div>
            </section>

            <section
              className="rounded-xl border border-[rgba(187,201,199,0.1)] bg-white p-[33px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
              aria-labelledby="security-heading"
            >
              <h2
                id="security-heading"
                className="mb-8 flex items-center gap-2 font-[family-name:var(--font-manrope)] text-xl font-bold text-[#191c1e]"
              >
                <span className="material-symbols-outlined notranslate text-xl text-[#006a65]">lock</span>
                Security Settings
              </h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div className="relative">
                  <label className="absolute left-1 top-[7px] text-[10px] font-semibold uppercase tracking-[0.5px] text-[#64748b]">
                    Current Password
                  </label>
                  <input
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="mt-[19px] w-full rounded-lg bg-[#f2f4f6] px-3 py-3.5 text-base text-[#191c1e] placeholder:text-[#6b7280]"
                  />
                </div>
                <div className="relative">
                  <label className="absolute left-1 top-[7px] text-[10px] font-semibold uppercase tracking-[0.5px] text-[#64748b]">
                    New Password
                  </label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-[19px] w-full rounded-lg bg-[#f2f4f6] px-3 py-3.5 text-base text-[#191c1e] placeholder:text-[#6b7280]"
                  />
                </div>
                <div className="relative">
                  <label className="absolute left-1 top-[7px] text-[10px] font-semibold uppercase tracking-[0.5px] text-[#64748b]">
                    Confirm New
                  </label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-[19px] w-full rounded-lg bg-[#f2f4f6] px-3 py-3.5 text-base text-[#191c1e] placeholder:text-[#6b7280]"
                  />
                </div>
              </div>
              <div className="mt-8 rounded-xl border border-[rgba(0,106,101,0.1)] bg-[rgba(0,106,101,0.05)] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex size-12 items-center justify-center rounded-full bg-white shadow-sm">
                      <span className="material-symbols-outlined notranslate text-xl text-[#006a65]">shield</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#191c1e]">Two-Factor Authentication</p>
                      <p className="mt-0.5 text-xs text-[#3c4948]">
                        Coming soon — advanced MFA enrollment is not enabled for this workspace yet.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={false}
                    aria-disabled={true}
                    disabled
                    title="Coming soon"
                    className="relative h-6 w-11 shrink-0 cursor-not-allowed rounded-full bg-[#e2e8f0] opacity-60"
                  >
                    <span className="absolute top-0.5 left-0.5 size-5 rounded-full border-2 border-white bg-white shadow" />
                  </button>
                </div>
              </div>
            </section>
          </div>

          <div className="flex flex-col gap-8 lg:col-span-4 lg:pb-14">
            <section
              className="rounded-xl border border-[rgba(187,201,199,0.1)] bg-white p-6 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
              aria-labelledby="appearance-heading"
            >
              <h2
                id="appearance-heading"
                className="mb-6 flex items-center gap-2 font-[family-name:var(--font-manrope)] text-lg font-bold text-[#191c1e]"
              >
                <span className="material-symbols-outlined notranslate text-xl text-[#006a65]">palette</span>
                Appearance
              </h2>
              <div className="grid grid-cols-3 gap-3">
                {(["light", "dark", "system"] as const).map((t) => {
                  const selected = prefs.theme === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setLocalPrefsDelta((d) => ({ ...d, theme: t }))}
                      className={`flex flex-col items-center gap-2 ${selected ? "" : "opacity-60"}`}
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
                                background: "linear-gradient(123deg, rgb(241, 245, 249) 0%, rgb(30, 41, 59) 100%)",
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
                        {t === "system" && <div className="h-14 rounded bg-white/20 backdrop-blur" />}
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

            <section
              className="rounded-xl border border-[rgba(187,201,199,0.1)] bg-white p-6 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
              aria-labelledby="preferences-heading"
            >
              <h2
                id="preferences-heading"
                className="mb-6 flex items-center gap-2 font-[family-name:var(--font-manrope)] text-lg font-bold text-[#191c1e]"
              >
                <span className="material-symbols-outlined notranslate text-xl text-[#006a65]">notifications</span>
                Preferences
              </h2>
              <div className="space-y-6">
                {[
                  {
                    label: "Email Alerts",
                    sub: "Weekly report summaries",
                    key: "emailAlerts" as const,
                  },
                  {
                    label: "SMS Alerts",
                    sub: "Critical stock levels",
                    key: "smsAlerts" as const,
                  },
                  {
                    label: "Push Notifications",
                    sub: "Immediate record updates",
                    key: "pushNotifications" as const,
                  },
                ].map(({ label, sub, key }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#191c1e]">{label}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-[-0.25px] text-[#64748b]">{sub}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={prefs[key]}
                      onClick={() =>
                        setLocalPrefsDelta((d) => ({
                          ...d,
                          [key]: !({ ...remotePrefs, ...d })[key],
                        }))
                      }
                      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                        prefs[key] ? "bg-[#006a65]" : "bg-[#e2e8f0]"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 size-4 rounded-full border border-white bg-white transition-all ${
                          prefs[key] ? "left-[18px] border-white" : "left-0.5 border-[#d1d5db]"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <div className="flex gap-4">
              <Link
                href={ROUTES.dashboard.main}
                className="flex flex-1 items-center justify-center rounded-xl bg-[#e0e3e5] py-3 text-base font-semibold text-[#191c1e] transition hover:bg-[#d1d5db]"
              >
                Cancel
              </Link>
              <button
                type="button"
                disabled={isSavingPrefs || isSavingPassword}
                onClick={() => void handleSaveChanges()}
                className="flex flex-1 items-center justify-center rounded-xl py-3 text-base font-semibold text-white shadow-[0px_10px_15px_-3px_rgba(0,106,101,0.2),0px_4px_6px_-4px_rgba(0,106,101,0.2)] transition hover:opacity-95 disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, rgb(15, 185, 177) 0%, rgb(99, 102, 241) 100%)",
                }}
              >
                {isSavingPrefs || isSavingPassword ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>

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
              className="absolute top-0 bottom-0 left-6 w-px opacity-30"
              style={{
                background: "linear-gradient(135deg, rgb(15, 185, 177) 0%, rgb(99, 102, 241) 100%)",
              }}
            />
            {activity.isLoading ? (
              <p className="text-sm text-[#64748b]">Loading activity…</p>
            ) : activity.isError ? (
              <p className="text-sm text-[#64748b]">Could not load activity.</p>
            ) : !activity.data?.items.length ? (
              <p className="text-sm text-[#64748b]">
                No recent security events yet. Sign-ins and password changes appear here when auth audit logging is
                enabled in your project database.
              </p>
            ) : (
              <div className="space-y-8">
                {activity.data.items.map((item) => (
                  <div key={item.id} className="flex gap-6">
                    <div
                      className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 bg-white shadow-sm"
                      style={{ borderColor: activityIconColor(item.icon) }}
                    >
                      <span
                        className="material-symbols-outlined notranslate text-lg"
                        style={{ color: activityIconColor(item.icon) }}
                      >
                        {activityIconGlyph(item.icon)}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 pt-1">
                      <p className="text-sm font-semibold text-[#191c1e]">{item.title}</p>
                      <p className="mt-1 text-xs text-[#3c4948]">{item.description}</p>
                      <p className="mt-1 text-[10px] font-semibold uppercase text-[#94a3b8]">
                        {formatActivityWhen(item.occurredAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
