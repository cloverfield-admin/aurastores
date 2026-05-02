"use client";

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
import { useUpdatePasswordMutation } from "@/lib/queries/auth";

export function UpdatePasswordForm() {
  const router = useRouter();
  const { notify, withLoading, isLoading } = useAuraFeedback();
  const updateMutation = useUpdatePasswordMutation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isBusy = isLoading("auth-update-password");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      const payload = await withLoading("auth-update-password", "Updating your password...", () =>
        updateMutation.mutateAsync({ password }),
      );

      notify({
        variant: "success",
        title: "Password updated",
        description: "Your new password is saved.",
      });
      router.push(payload.redirectTo);
      router.refresh();
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Could not update your password.";
      setError(message);
      notify({
        variant: "error",
        title: "Update failed",
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
            <AuraFieldLabel htmlFor="new-password">New password</AuraFieldLabel>
            <AuraInputWrap icon="lock">
              <input
                id="new-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                className={`${auraInputClassName()} pr-12`}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
                maxLength={128}
              />
              <PasswordRevealButton
                passwordVisible={showPassword}
                onToggle={() => setShowPassword((v) => !v)}
                accessibleName="new password"
              />
            </AuraInputWrap>
          </div>

          <div>
            <AuraFieldLabel htmlFor="confirm-password">Confirm new password</AuraFieldLabel>
            <AuraInputWrap icon="lock">
              <input
                id="confirm-password"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Re-enter your password"
                className={`${auraInputClassName()} pr-12`}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={8}
                maxLength={128}
              />
              <PasswordRevealButton
                passwordVisible={showConfirmPassword}
                onToggle={() => setShowConfirmPassword((v) => !v)}
                accessibleName="confirm password"
              />
            </AuraInputWrap>
          </div>
        </fieldset>

        {error ? (
          <AuraInlineAlert variant="error" title="Unable to update password" description={error} />
        ) : null}

        <AuraGradientSubmit disabled={isBusy}>
          {updateMutation.isPending ? "Saving..." : "Save new password"}
        </AuraGradientSubmit>
      </form>
    </AuraAuthCard>
  );
}
