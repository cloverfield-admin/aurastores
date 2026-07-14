"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAuraFeedback } from "@/components/providers/aura-feedback-provider";
import { apiUrl } from "@/lib/api/version";
import { useImpersonation } from "@/components/admin/impersonation-provider";
import { createQueryIdbPersister } from "@/lib/query-idb-persister";
import { ROUTES } from "@/lib/routes";

const NAV: Array<{ label: string; icon: string; href: string; exact?: boolean }> = [
  { label: "Overview", icon: "monitoring", href: ROUTES.admin.root, exact: true },
  { label: "Companies", icon: "storefront", href: ROUTES.admin.companies },
  { label: "Revenue", icon: "payments", href: ROUTES.admin.revenue },
  { label: "Growth", icon: "trending_up", href: ROUTES.admin.growth },
  { label: "Pricing", icon: "sell", href: ROUTES.admin.pricing },
  { label: "Audit log", icon: "history", href: ROUTES.admin.audit },
];

/**
 * The platform console's own chrome.
 *
 * Deliberately does NOT reuse DashboardShell: that shell's branch switcher,
 * capability-gated nav and onboarding redirect are all tenant-scoped, and would
 * fight a view whose whole job is to look at every tenant at once.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { withLoading, isLoading } = useAuraFeedback();
  const { target, stop } = useImpersonation();

  const signingOut = isLoading("auth:sign-out");

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
    <div className="min-h-dvh bg-[var(--app-bg)]">
      {/* An impersonation session is easy to forget you're in, and every number on
          screen belongs to someone else's business while you are. The banner is
          persistent, unmissable, and always one click from ending. */}
      {target ? (
        <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-[#f0c36d] bg-[#fdf6e3] px-4 py-2.5 text-[#7a5b16] sm:px-6">
          <p className="flex min-w-0 items-start gap-2 text-xs font-semibold sm:items-center sm:text-sm">
            <span aria-hidden className="material-symbols-outlined notranslate shrink-0 text-lg">
              visibility
            </span>
            <span className="min-w-0">
              Viewing <strong className="font-extrabold">{target.display_name}</strong> as a read-only
              observer.{" "}
              {/* The reassurance is the first thing to drop on a narrow screen — the
                  fact that you ARE impersonating is what must never be cut. */}
              <span className="hidden sm:inline">Nothing you do here can change their data.</span>
            </span>
          </p>
          <button
            type="button"
            onClick={() => {
              stop();
              router.push(ROUTES.admin.company(target.id));
            }}
            className="ml-auto shrink-0 rounded-lg bg-[#7a5b16] px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90"
          >
            Exit store view
          </button>
        </div>
      ) : null}

      <div className="mx-auto flex max-w-[1400px] flex-col gap-0 lg:flex-row">
        <aside className="border-b border-[var(--app-border)] bg-[var(--app-surface)] lg:min-h-dvh lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-2 px-4 py-4 sm:px-6 lg:py-5">
            <div className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden
                className="material-symbols-outlined notranslate flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--app-brand)] text-lg text-white"
              >
                shield_person
              </span>
              <div className="min-w-0 leading-tight">
                <p className="font-[family-name:var(--font-manrope)] text-sm font-extrabold text-[var(--app-text)]">
                  AuraStores
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-faint)]">
                  Platform admin
                </p>
              </div>
            </div>

            {/* Sign-out lives in the sidebar footer on desktop — but that footer is
                lg-only, so below lg it has to live HERE. Without it an admin on a
                phone has no way out of the console at all. */}
            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={signingOut}
              aria-label="Sign out"
              className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[var(--app-border-ui)] text-[var(--app-text-muted)] transition hover:bg-[var(--app-surface-subtle)] hover:text-[#dc2626] disabled:opacity-60 lg:hidden"
            >
              <span aria-hidden className="material-symbols-outlined notranslate text-lg">
                logout
              </span>
            </button>
          </div>

          {/* Below lg the nav is a horizontal strip. `-mx-*`/`px-*` keeps the first
              and last pill from being clipped by the scroll container's edge. */}
          <nav
            aria-label="Platform admin"
            className="flex gap-1 overflow-x-auto overscroll-x-contain px-4 pb-3 sm:px-6 lg:flex-col lg:overflow-visible lg:px-3"
          >
            {NAV.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-[rgba(15,185,177,0.14)] text-[var(--app-link-teal)]"
                      : "text-[var(--app-text-muted)] hover:bg-[var(--app-surface-subtle)]"
                  }`}
                >
                  <span aria-hidden className="material-symbols-outlined notranslate text-lg">
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* No "back to my store": /dashboard is closed, and an admin who also owns
              a store runs it from the mobile app like everyone else. */}
          <div className="hidden border-t border-[var(--app-border)] p-3 lg:block">
            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={signingOut}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[var(--app-text-muted)] transition hover:bg-[var(--app-surface-subtle)] hover:text-[#dc2626] disabled:opacity-60"
            >
              <span aria-hidden className="material-symbols-outlined notranslate text-lg">
                logout
              </span>
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 pb-16 pt-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
