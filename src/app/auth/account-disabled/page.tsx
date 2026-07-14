import type { Metadata } from "next";
import { Suspense } from "react";
import {
  AuraAuthBackground,
  AuraAuthBranding,
  AuraAuthFooter,
} from "@/components/auth/aura-auth-chrome";
import { AccountDisabledPanel } from "@/components/auth/account-disabled-panel";

export const metadata: Metadata = {
  title: "Account unavailable",
  description: "This AuraStores account is currently unavailable.",
  robots: { index: false, follow: false },
};

export default function AccountDisabledPage() {
  return (
    <>
      <AuraAuthBackground />
      <div className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-16">
        <div className="flex w-full max-w-md flex-col items-center gap-10">
          <AuraAuthBranding />
          <Suspense fallback={null}>
            <AccountDisabledPanel />
          </Suspense>
          <AuraAuthFooter />
        </div>
      </div>
    </>
  );
}
