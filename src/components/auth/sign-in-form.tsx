"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  AuraAuthCard,
  AuraFieldLabel,
  AuraGradientSubmit,
  AuraInputWrap,
  auraInputClassName,
} from "@/components/auth/aura-auth-chrome";
import { PasswordRevealButton } from "@/components/auth/password-reveal-button";
import { useAuraFeedback } from "@/components/providers/aura-feedback-provider";
import { AuraInlineAlert } from "@/components/ui/aura-inline-alert";
import { useSignInMutation } from "@/lib/queries/auth";
import { ROUTES } from "@/lib/routes";

export function SignInForm() {
  const router = useRouter();
  const { notify, withLoading, isLoading } = useAuraFeedback();
  const signInMutation = useSignInMutation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isBusy = isLoading("auth-sign-in");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    try {
      const payload = await withLoading("auth-sign-in", "Verifying your credentials...", () =>
        signInMutation.mutateAsync({ email, password, remember }),
      );

      router.push(payload.redirectTo);
      router.refresh();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Could not sign in.";
      setError(message);
      notify({
        variant: "error",
        title: "Sign-in failed",
        description: message,
      });
    }
  }

  return (
    <AuraAuthCard>
      <form
        className={`flex flex-col gap-6 transition ${isBusy ? "opacity-75" : ""}`}
        onSubmit={handleSubmit}
        aria-busy={isBusy}
      >
        <fieldset disabled={isBusy} className="contents">
          <div>
            <AuraFieldLabel htmlFor="email">Email Address</AuraFieldLabel>
            <AuraInputWrap icon="mail">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="pharmacist@example.com"
                className={auraInputClassName()}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </AuraInputWrap>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4 pl-1">
              <AuraFieldLabel htmlFor="password" className="mb-0">
                Password
              </AuraFieldLabel>
              <Link
                href={ROUTES.auth.forgotPassword}
                className={`shrink-0 text-xs font-semibold text-[var(--app-brand)] hover:underline ${isBusy ? "pointer-events-none opacity-60" : ""}`}
              >
                Forgot password?
              </Link>
            </div>
            <AuraInputWrap icon="lock">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                className={`${auraInputClassName()} pr-12`}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <PasswordRevealButton
                passwordVisible={showPassword}
                onToggle={() => setShowPassword((v) => !v)}
                accessibleName="password"
              />
            </AuraInputWrap>
          </div>

          <label className="flex cursor-pointer items-center gap-3 pl-0.5">
            <input
              name="remember"
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              className="size-4 rounded border-[#bbc9c7] bg-[var(--app-input-bg)] text-[var(--app-brand)] accent-[#006a65]"
            />
            <span className="text-sm font-medium text-[var(--app-text-secondary)]">
              Remember my session
            </span>
          </label>
        </fieldset>

        {error ? (
          <AuraInlineAlert
            variant="error"
            title="Unable to sign you in"
            description={error}
          />
        ) : null}

        <AuraGradientSubmit disabled={isBusy}>
          {signInMutation.isPending ? "Signing In..." : "Sign In to AuraStores"}
        </AuraGradientSubmit>
      </form>

      <div className="mt-8 border-t border-[rgba(187,201,199,0.35)] pt-6 text-center text-sm">
        <span className="font-medium text-[var(--app-text-secondary)]">New to the platform? </span>
        <Link
          href={ROUTES.auth.register}
          className="font-semibold text-[var(--app-brand)] hover:underline"
        >
          Create an account
        </Link>
      </div>
    </AuraAuthCard>
  );
}
