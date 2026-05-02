import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterPortal } from "@/components/auth/register-portal";

export const metadata: Metadata = {
  title: "Register",
  description:
    "Create your AuraStores account and access clinical intelligence tools for your pharmacy.",
};

function RegisterLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--app-canvas)] text-sm text-[var(--app-text-muted)]">
      Loading registration…
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterLoading />}>
      <RegisterPortal />
    </Suspense>
  );
}
