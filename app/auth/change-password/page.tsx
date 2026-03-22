import Link from "next/link";
import type { Metadata } from "next";
import {
  AuraAuthBackground,
  AuraAuthBranding,
  AuraAuthCard,
  AuraAuthFooter,
} from "@/components/auth/aura-auth-chrome";
import { ROUTES } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Forgot password — AuraPharma",
  description: "Reset your AuraPharma account password.",
};

export default function ChangePasswordPage() {
  return (
    <>
      <AuraAuthBackground />
      <div className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-16">
        <div className="flex w-full max-w-md flex-col items-center gap-10">
          <AuraAuthBranding />

          <AuraAuthCard>
            <h2 className="text-center text-xl font-bold text-[#191c1e]">
              Reset your password
            </h2>
            <p className="mt-3 text-center text-sm leading-relaxed text-[#3c4948]">
              Password recovery will be available soon. For now, contact your workspace
              administrator or support.
            </p>
            <Link
              href={ROUTES.auth.signIn}
              className="mt-8 block w-full rounded-lg border-2 border-[#006a65] py-3.5 text-center text-sm font-bold text-[#006a65] transition hover:bg-[#006a65]/5"
            >
              Back to sign in
            </Link>
          </AuraAuthCard>

          <AuraAuthFooter />
        </div>
      </div>
    </>
  );
}
