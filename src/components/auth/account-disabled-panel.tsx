"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AuraAuthCard } from "@/components/auth/aura-auth-chrome";
import { useAuraFeedback } from "@/components/providers/aura-feedback-provider";
import { apiUrl } from "@/lib/api/version";
import { parseAccountStatusCode, type AccountStatusCode } from "@/lib/auth/account-status";
import { createQueryIdbPersister } from "@/lib/query-idb-persister";
import { ROUTES } from "@/lib/routes";

type Copy = { icon: string; title: string; body: string };

const COPY: Record<AccountStatusCode, Copy> = {
  account_disabled: {
    icon: "person_off",
    title: "Account disabled",
    body: "Your AuraStores account has been disabled and can no longer be used to sign in. If you think this is a mistake, contact support and we'll take a look.",
  },
  organization_suspended: {
    icon: "pause_circle",
    title: "Store suspended",
    body: "Your store has been suspended, so the dashboard is unavailable for everyone on the team. Your data is safe. Contact support to get it reinstated.",
  },
  organization_archived: {
    icon: "inventory_2",
    title: "Store archived",
    body: "Your store has been archived and is no longer active. Contact support if you need it reopened.",
  },
  membership_suspended: {
    icon: "no_accounts",
    title: "Access revoked",
    body: "Your access to this store has been revoked. If you still need access, ask an owner or admin at your store to restore it.",
  },
};

const FALLBACK: Copy = {
  icon: "help",
  title: "Account unavailable",
  body: "This account can't access the dashboard right now. Contact support if you need help.",
};

export function AccountDisabledPanel() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { withLoading, isLoading } = useAuraFeedback();

  const code = parseAccountStatusCode(searchParams.get("reason"));
  const copy = code ? COPY[code] : FALLBACK;
  const isBusy = isLoading("auth:sign-out");

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
          className="material-symbols-outlined notranslate flex size-14 items-center justify-center rounded-2xl bg-[#fdf3f3] text-3xl text-[#7d2a2a]"
        >
          {copy.icon}
        </span>

        <div className="space-y-2">
          <h1 className="font-[family-name:var(--font-manrope)] text-2xl font-extrabold tracking-tight text-[var(--app-text)]">
            {copy.title}
          </h1>
          <p className="text-sm leading-relaxed text-[var(--app-text-muted)]">{copy.body}</p>
        </div>

        <div className="flex w-full flex-col gap-2 pt-2">
          <a
            href="mailto:support@aurastores.com"
            className="w-full rounded-lg bg-[var(--app-brand)] px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
          >
            Contact support
          </a>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={isBusy}
            className="w-full rounded-lg border border-[var(--app-border-ui)] px-4 py-2.5 text-sm font-semibold text-[var(--app-text-muted)] transition hover:bg-[var(--app-surface-subtle)] disabled:opacity-60"
          >
            {isBusy ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </div>
    </AuraAuthCard>
  );
}
