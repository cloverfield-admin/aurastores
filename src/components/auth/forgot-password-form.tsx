"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  AuraAuthCard,
  AuraFieldLabel,
  AuraGradientSubmit,
  AuraInputWrap,
  auraInputClassName,
} from "@/components/auth/aura-auth-chrome";
import { useAuraFeedback } from "@/components/providers/aura-feedback-provider";
import { AuraInlineAlert } from "@/components/ui/aura-inline-alert";
import { useForgotPasswordMutation } from "@/lib/queries/auth";
import { ROUTES } from "@/lib/routes";

export function ForgotPasswordForm() {
  const { notify, withLoading, isLoading } = useAuraFeedback();
  const forgotMutation = useForgotPasswordMutation();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const isBusy = isLoading("auth-forgot-password");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    try {
      const payload = await withLoading("auth-forgot-password", "Sending reset link...", () =>
        forgotMutation.mutateAsync({ email }),
      );
      setInfo(payload.message);
      notify({
        variant: "success",
        title: "Check your email",
        description: payload.message,
      });
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Could not send reset email.";
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
      <form
        className={`flex flex-col gap-6 transition ${isBusy ? "opacity-75" : ""}`}
        onSubmit={handleSubmit}
        aria-busy={isBusy}
      >
        <fieldset disabled={isBusy} className="contents">
          <div>
            <AuraFieldLabel htmlFor="forgot-email">Email Address</AuraFieldLabel>
            <AuraInputWrap icon="mail">
              <input
                id="forgot-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="pharmacist@aurapharma.com"
                className={auraInputClassName()}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </AuraInputWrap>
          </div>
        </fieldset>

        {info ? (
          <AuraInlineAlert variant="success" title="Email sent" description={info} />
        ) : null}

        {error ? (
          <AuraInlineAlert variant="error" title="Something went wrong" description={error} />
        ) : null}

        <AuraGradientSubmit disabled={isBusy}>
          {forgotMutation.isPending ? "Sending..." : "Send reset link"}
        </AuraGradientSubmit>
      </form>

      <div className="mt-8 border-t border-[rgba(187,201,199,0.35)] pt-6 text-center text-sm">
        <Link
          href={ROUTES.auth.signIn}
          className={`font-semibold text-[#006a65] hover:underline ${isBusy ? "pointer-events-none opacity-60" : ""}`}
        >
          Back to sign in
        </Link>
      </div>
    </AuraAuthCard>
  );
}
