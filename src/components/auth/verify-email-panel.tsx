"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  AuraAuthCard,
  AuraFieldLabel,
  AuraGradientSubmit,
  AuraInputWrap,
  auraInputClassName,
} from "@/components/auth/aura-auth-chrome";
import { useAuraFeedback } from "@/components/providers/aura-feedback-provider";
import { AuraInlineAlert } from "@/components/ui/aura-inline-alert";
import { useResendVerificationMutation } from "@/lib/queries/auth";
import { ROUTES } from "@/lib/routes";

export function VerifyEmailPanel() {
  const searchParams = useSearchParams();
  const { notify, withLoading, isLoading } = useAuraFeedback();
  const resendMutation = useResendVerificationMutation();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const isBusy = isLoading("auth-resend-verification");

  useEffect(() => {
    const fromQuery = searchParams.get("email")?.trim();
    if (fromQuery) {
      setEmail(fromQuery);
    }
  }, [searchParams]);

  async function handleResend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!email.trim()) {
      setError("Enter the email you used to register.");
      return;
    }

    try {
      const payload = await withLoading("auth-resend-verification", "Sending confirmation...", () =>
        resendMutation.mutateAsync({ email: email.trim() }),
      );
      setInfo(payload.message);
      notify({
        variant: "success",
        title: "Email sent",
        description: payload.message,
      });
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Could not resend the confirmation email.";
      setError(message);
      notify({
        variant: "error",
        title: "Request failed",
        description: message,
      });
    }
  }

  return (
    <AuraAuthCard>
      <div className="space-y-3 text-center">
        <h2 className="text-xl font-bold text-[var(--app-text)]">Verify your email</h2>
        <p className="text-sm leading-relaxed text-[var(--app-text-secondary)]">
          We sent a confirmation link to your inbox. Open it on this device to activate your account,
          then you can sign in and continue onboarding.
        </p>
      </div>

      <form
        className={`mt-8 flex flex-col gap-6 transition ${isBusy ? "opacity-75" : ""}`}
        onSubmit={handleResend}
        aria-busy={isBusy}
      >
        <fieldset disabled={isBusy} className="contents">
          <div>
            <AuraFieldLabel htmlFor="verify-email">Your email</AuraFieldLabel>
            <AuraInputWrap icon="mail">
              <input
                id="verify-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className={auraInputClassName()}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </AuraInputWrap>
          </div>
        </fieldset>

        {info ? (
          <AuraInlineAlert variant="success" title="Check your inbox" description={info} />
        ) : null}

        {error ? (
          <AuraInlineAlert variant="error" title="Something went wrong" description={error} />
        ) : null}

        <AuraGradientSubmit disabled={isBusy}>
          {resendMutation.isPending ? "Sending..." : "Resend confirmation email"}
        </AuraGradientSubmit>
      </form>

      <div className="mt-8 border-t border-[rgba(187,201,199,0.35)] pt-6 text-center text-sm">
        <span className="font-medium text-[var(--app-text-secondary)]">Already verified? </span>
        <Link
          href={ROUTES.auth.signIn}
          className={`font-semibold text-[var(--app-brand)] hover:underline ${isBusy ? "pointer-events-none opacity-60" : ""}`}
        >
          Sign in
        </Link>
      </div>
    </AuraAuthCard>
  );
}
