import type { Metadata } from "next";
import {
  AuraAuthBackground,
  AuraAuthBranding,
  AuraAuthFooter,
} from "@/components/auth/aura-auth-chrome";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = {
  title: "Sign in — AuraPharma",
  description: "Sign in to your AuraPharma pharmacy workspace.",
};

export default function SignInPage() {
  return (
    <>
      <AuraAuthBackground />
      <div className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-16">
        <div className="flex w-full max-w-md flex-col items-center gap-10">
          <AuraAuthBranding />
          <SignInForm />
          <AuraAuthFooter />
        </div>
      </div>
    </>
  );
}
