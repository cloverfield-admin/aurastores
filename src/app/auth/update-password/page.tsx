import type { Metadata } from "next";
import {
  AuraAuthBackground,
  AuraAuthBranding,
  AuraAuthFooter,
} from "@/components/auth/aura-auth-chrome";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";

export const metadata: Metadata = {
  title: "Set new password",
  description: "Choose a new password for your AuraStores account.",
};

export default function UpdatePasswordPage() {
  return (
    <>
      <AuraAuthBackground />
      <div className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-16">
        <div className="flex w-full max-w-md flex-col items-center gap-10">
          <AuraAuthBranding />
          <div className="w-full space-y-4">
            <h1 className="text-center text-xl font-bold text-[var(--app-text)]">Choose a new password</h1>
            <p className="text-center text-sm leading-relaxed text-[var(--app-text-secondary)]">
              Use at least 8 characters. After saving, you will continue into your workspace.
            </p>
          </div>
          <UpdatePasswordForm />
          <AuraAuthFooter />
        </div>
      </div>
    </>
  );
}
