import type { Metadata } from "next";
import { Suspense } from "react";
import {
  AuraAuthBackground,
  AuraAuthBranding,
  AuraAuthFooter,
} from "@/components/auth/aura-auth-chrome";
import { VerifyEmailPanel } from "@/components/auth/verify-email-panel";

export const metadata: Metadata = {
  title: "Verify your email",
  description: "Confirm your email address to continue with AuraStores onboarding.",
};

export default function VerifyEmailPage() {
  return (
    <>
      <AuraAuthBackground />
      <div className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-16">
        <div className="flex w-full max-w-md flex-col items-center gap-10">
          <AuraAuthBranding />
          <Suspense fallback={null}>
            <VerifyEmailPanel />
          </Suspense>
          <AuraAuthFooter />
        </div>
      </div>
    </>
  );
}
