import type { Metadata } from "next";
import {
  AuraAuthBackground,
  AuraAuthBranding,
  AuraAuthFooter,
} from "@/components/auth/aura-auth-chrome";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Request a link to reset your AuraStores account password.",
};

export default function ForgotPasswordPage() {
  return (
    <>
      <AuraAuthBackground />
      <div className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-16">
        <div className="flex w-full max-w-md flex-col items-center gap-10">
          <AuraAuthBranding />
          <ForgotPasswordForm />
          <AuraAuthFooter />
        </div>
      </div>
    </>
  );
}
