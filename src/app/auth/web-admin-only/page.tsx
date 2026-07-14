import type { Metadata } from "next";
import {
  AuraAuthBackground,
  AuraAuthBranding,
  AuraAuthFooter,
} from "@/components/auth/aura-auth-chrome";
import { WebAdminOnlyPanel } from "@/components/auth/web-admin-only-panel";

export const metadata: Metadata = {
  title: "Platform staff only",
  description: "The AuraStores web app is for platform staff.",
  robots: { index: false, follow: false },
};

export default function WebAdminOnlyPage() {
  return (
    <>
      <AuraAuthBackground />
      <div className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-16">
        <div className="flex w-full max-w-md flex-col items-center gap-10">
          <AuraAuthBranding />
          <WebAdminOnlyPanel />
          <AuraAuthFooter />
        </div>
      </div>
    </>
  );
}
