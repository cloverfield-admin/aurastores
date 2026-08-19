"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  BARE_INPUT,
  BillingIcon,
  BillingShell,
  BillingWordmark,
  C,
  FIELD_LABEL,
  FONT_BODY,
  FONT_DISPLAY,
  FONT_MONO,
  INPUT_WRAP,
  PRIMARY_BUTTON,
  RADIUS,
} from "@/components/billing/billing-chrome";
import { safeInternalNextPath } from "@/lib/auth/safe-redirect";
import { ROUTES } from "@/lib/routes";

/** Title-cases a plan code for the "continue to checkout" line. */
function planLabel(code: string): string {
  return code.charAt(0).toUpperCase() + code.slice(1);
}

type SignInResult = { redirectTo: string };

type ApiError = { error?: string; code?: string };

/**
 * Billing-only sign-in.
 *
 * Posts to `/api/v1/auth/billing-sign-in`, which is the door for Store Owners
 * and Store Managers — the console's own sign-in refuses anyone who is not
 * platform staff. The role check happens there, server-side; this screen only
 * renders whatever it says.
 */
export function BillingSignInContent() {
  const router = useRouter();
  const params = useSearchParams();
  // Where the visitor was headed before the proxy bounced them here — a plan
  // chosen on the landing page, typically. Constrained to /billing so a crafted
  // ?next= cannot turn sign-in into an open redirect.
  const requestedNext = safeInternalNextPath(params.get("next"));
  const nextPath = requestedNext?.startsWith("/billing") ? requestedNext : null;
  const pickedPlan = nextPath ? new URLSearchParams(nextPath.split("?")[1] ?? "").get("plan") : null;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const response = await fetch("/api/v1/auth/billing-sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = (await response.json().catch(() => null)) as (SignInResult & ApiError) | null;

      if (!response.ok) {
        setError(payload?.error ?? "Could not sign in with those credentials.");
        return;
      }

      // The portal decides where sign-in normally lands; an explicit destination
      // (a plan they picked) wins over that default.
      router.push(nextPath ?? payload?.redirectTo ?? "/billing");
      router.refresh();
    } catch {
      setError("Could not reach AuraStores. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <BillingShell>
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
          padding: "56px 24px",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: -200,
            right: -140,
            width: 520,
            height: 520,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(13,92,84,0.09), transparent 68%)",
          }}
        />
        <div style={{ width: 420, maxWidth: "100%", position: "relative" }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <BillingWordmark size={21} />
          </div>

          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: RADIUS.cardLg,
              padding: "34px 32px",
              marginTop: 26,
              boxShadow: "0 20px 50px -24px rgba(7,50,46,0.18)",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                fontFamily: FONT_MONO,
                fontSize: 10.5,
                letterSpacing: "0.12em",
                color: C.primary,
                background: C.tint,
                borderRadius: RADIUS.pill,
                padding: "6px 12px",
              }}
            >
              <BillingIcon name="workspace_premium" size={14} />
              BILLING PORTAL
            </span>

            <h1
              style={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                fontSize: 26,
                letterSpacing: "-0.02em",
                margin: "16px 0 0",
              }}
            >
              Sign in to manage your plan
            </h1>
            <p style={{ fontSize: 14, lineHeight: 1.55, color: C.secondary, margin: "10px 0 0" }}>
              {pickedPlan
                ? `Sign in to continue to checkout for the ${planLabel(pickedPlan)} plan.`
                : "Sign in with the email and password on your AuraStores account."}
            </p>

            {/* There is no web sign-up: accounts are created in the app, and only
                an owner or manager can reach billing. Saying so here saves a
                round trip through a failed sign-in. */}
            <div
              style={{
                display: "flex",
                gap: 10,
                background: "#fdf6f0",
                border: `1px solid ${C.warnBg}`,
                borderRadius: RADIUS.control,
                padding: "12px 13px",
                marginTop: 16,
              }}
            >
              <BillingIcon name="info" size={18} color={C.warn} style={{ flexShrink: 0 }} />
              <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "#7a4a2c", margin: 0 }}>
                You need an <strong>existing AuraStores account</strong>, and you must be the{" "}
                <strong>Store Owner or a Store Manager</strong>. There is no sign-up here — create
                your store in the AuraStores app first.
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <fieldset
                disabled={busy}
                style={{ border: "none", margin: 0, padding: 0, opacity: busy ? 0.75 : 1 }}
              >
                <label htmlFor="billing-email" style={{ ...FIELD_LABEL, marginTop: 24 }}>
                  Email
                </label>
                <div style={INPUT_WRAP}>
                  <BillingIcon name="mail" size={18} color={C.placeholder} />
                  <input
                    id="billing-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="you@yourstore.co.zm"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={BARE_INPUT}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: 18,
                  }}
                >
                  <label htmlFor="billing-password" style={FIELD_LABEL}>
                    Password
                  </label>
                  <Link
                    href={ROUTES.auth.forgotPassword}
                    style={{
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: C.primary,
                      textDecoration: "none",
                    }}
                  >
                    Forgot password?
                  </Link>
                </div>
                <div style={INPUT_WRAP}>
                  <BillingIcon name="key" size={18} color={C.placeholder} />
                  <input
                    id="billing-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    placeholder="••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={BARE_INPUT}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    style={{
                      border: "none",
                      background: "transparent",
                      padding: 0,
                      cursor: "pointer",
                      display: "flex",
                    }}
                  >
                    <BillingIcon
                      name={showPassword ? "visibility_off" : "visibility"}
                      size={18}
                      color={C.placeholder}
                    />
                  </button>
                </div>

                {error ? (
                  <div
                    role="alert"
                    style={{
                      display: "flex",
                      gap: 10,
                      background: "#fdf1f0",
                      border: "1px solid #f3d9d6",
                      borderRadius: RADIUS.control,
                      padding: "12px 13px",
                      marginTop: 18,
                    }}
                  >
                    <BillingIcon
                      name="error"
                      size={18}
                      color={C.danger}
                      style={{ flexShrink: 0 }}
                    />
                    <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "#7d2b25", margin: 0 }}>
                      {error}
                    </p>
                  </div>
                ) : null}

                <button type="submit" style={{ ...PRIMARY_BUTTON, marginTop: 20 }}>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 15, fontWeight: 600 }}>
                    {busy ? "Signing in…" : "Sign in"}
                  </span>
                  {busy ? null : <BillingIcon name="arrow_forward" size={19} color={C.mint} />}
                </button>
              </fieldset>
            </form>

            <div
              style={{
                display: "flex",
                gap: 10,
                background: C.surfaceMuted,
                borderRadius: RADIUS.control,
                padding: "13px 14px",
                marginTop: 20,
              }}
            >
              <BillingIcon
                name="shield_person"
                size={18}
                color={C.primary}
                style={{ flexShrink: 0 }}
              />
              <p style={{ fontSize: 12.5, lineHeight: 1.5, color: C.muted, margin: 0 }}>
                Web sign-in is for{" "}
                <strong style={{ color: "#2f4540" }}>Store Owners and Store Managers</strong> to
                manage subscriptions. Day-to-day store operations stay in the app.
              </p>
            </div>
          </div>

          <p
            style={{
              textAlign: "center",
              fontFamily: FONT_MONO,
              fontSize: 11,
              color: C.faint,
              marginTop: 18,
            }}
          >
            Not a manager yet? Ask your Store Owner for access.
          </p>
        </div>
      </div>
    </BillingShell>
  );
}
