"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/routes";

export function OfflineActions() {
  const router = useRouter();

  return (
    <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
      <button
        type="button"
        className="rounded-xl bg-gradient-to-br from-[#0fb9b1] to-[#6366f1] px-5 py-2.5 text-sm font-semibold text-white shadow-sm"
        onClick={() => router.refresh()}
      >
        Retry
      </button>
      <Link
        href={ROUTES.auth.signIn}
        className="rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-2.5 text-sm font-semibold text-zinc-800"
      >
        Sign in
      </Link>
    </div>
  );
}
