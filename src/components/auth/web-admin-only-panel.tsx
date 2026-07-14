"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AuraAuthCard } from "@/components/auth/aura-auth-chrome";
import { useAuraFeedback } from "@/components/providers/aura-feedback-provider";
import { apiUrl } from "@/lib/api/version";
import { createQueryIdbPersister } from "@/lib/query-idb-persister";
import { ROUTES } from "@/lib/routes";

/**
 * Shown when someone who is not a platform admin ends up authenticated on the web —
 * either they still had a live cookie from before the lockdown, or they followed an
 * email link straight into a session.
 *
 * It always offers a sign-out, because leaving a valid session attached to an
 * account that can reach nothing is how you get a user stuck in a redirect loop with
 * no way to explain it.
 */
export function WebAdminOnlyPanel() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { withLoading, isLoading } = useAuraFeedback();
  const busy = isLoading("auth:sign-out");

  async function handleSignOut() {
    await withLoading("auth:sign-out", "Signing you out...", async () => {
      await fetch(apiUrl("/auth/sign-out"), { method: "POST" }).catch(() => null);
      await queryClient.cancelQueries();
      queryClient.clear();
      await Promise.resolve(createQueryIdbPersister().removeClient()).catch(() => null);
    });
    router.push(ROUTES.auth.signIn);
    router.refresh();
  }

  return (
    <AuraAuthCard>
      <div className="flex flex-col items-center gap-5 text-center">
        <span
          aria-hidden
          className="material-symbols-outlined notranslate flex size-14 items-center justify-center rounded-2xl bg-[var(--app-surface-subtle)] text-3xl text-[var(--app-text-muted)]"
        >
          smartphone
        </span>

        <div className="space-y-2">
          <h1 className="font-[family-name:var(--font-manrope)] text-2xl font-extrabold tracking-tight text-[var(--app-text)]">
            Run your store from the app
          </h1>
          <p className="text-sm leading-relaxed text-[var(--app-text-muted)]">
            The AuraStores web app is for platform staff. Everything you need to run your
            store — sales, stock, staff, payments — lives in the AuraStores mobile app.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 pt-2">
          <Link
            href="/"
            className="w-full rounded-lg bg-[var(--app-brand)] px-4 py-2.5 text-center text-sm font-bold text-white transition hover:opacity-90"
          >
            Get the app
          </Link>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={busy}
            className="w-full rounded-lg border border-[var(--app-border-ui)] px-4 py-2.5 text-sm font-semibold text-[var(--app-text-muted)] transition hover:bg-[var(--app-surface-subtle)] disabled:opacity-60"
          >
            {busy ? "Signing out…" : "Sign out"}
          </button>
        </div>

        <p className="text-xs text-[var(--app-text-faint)]">
          Platform staff? Contact your administrator if you should have console access.
        </p>
      </div>
    </AuraAuthCard>
  );
}
