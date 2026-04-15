"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import type { DashboardWorkspaceAccess } from "@/components/dashboard/dashboard-workspace";
import { MissingCapabilityNotice } from "@/components/dashboard/missing-capability-notice";
import { useAuraFeedback } from "@/components/providers/aura-feedback-provider";
import { apiUrl } from "@/lib/api/version";
import { ROUTES } from "@/lib/routes";
import { PharmacySearchField } from "@/components/dashboard/pharmacy-search-field";
import { AuraAvatar } from "@/components/ui/aura-avatar";
import type { MembershipCapability } from "@/lib/rbac/capabilities";
import { hasCapability, membershipCapabilityLabel } from "@/lib/rbac/capabilities";
import { dashboardModuleCapabilityForPath } from "@/lib/rbac/dashboard-path-capability";
import { isOrganizationOwnerOrAdmin } from "@/lib/membership-display";

/** Breathing room between fixed header and main scroll area (px). */
const MAIN_BELOW_HEADER_GAP_PX = 8;

const MODULE_NAV: { label: string; icon: string; href: string; capability: MembershipCapability }[] = [
  { label: "Aura Stock", icon: "inventory_2", href: ROUTES.dashboard.stock, capability: "stock" },
  { label: "Aura Sales", icon: "trending_up", href: ROUTES.dashboard.sales, capability: "sales" },
  { label: "Aura Pay", icon: "payments", href: ROUTES.dashboard.pay, capability: "pay" },
  { label: "Aura Insights", icon: "insights", href: ROUTES.dashboard.insights, capability: "insights" },
  {
    label: "Product Categories",
    icon: "category",
    href: ROUTES.dashboard.productCategories,
    capability: "catalog",
  },
  { label: "Staff", icon: "groups", href: ROUTES.dashboard.staff, capability: "staff" },
];

type DashboardShellProps = {
  children: ReactNode;
  workspaceAccess: DashboardWorkspaceAccess;
};

export function DashboardShell({ children, workspaceAccess }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { withLoading, notify } = useAuraFeedback();
  const [localSearch, setLocalSearch] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | "mobile" | "desktop">(null);
  const [lockedFeature, setLockedFeature] = useState<{
    capability: MembershipCapability;
    label: string;
    moduleLabel: string;
  } | null>(null);
  const [headerHeightPx, setHeaderHeightPx] = useState<number | null>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileNavCloseRef = useRef<HTMLButtonElement>(null);
  const mobileToolsToggleRef = useRef<HTMLButtonElement>(null);
  const mobileToolsPanelRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const userMenuRootMobileRef = useRef<HTMLDivElement>(null);
  const userMenuRootDesktopRef = useRef<HTMLDivElement>(null);
  const userMenuTriggerMobileRef = useRef<HTMLButtonElement>(null);
  const userMenuTriggerDesktopRef = useRef<HTMLButtonElement>(null);
  const userMenuBaseId = useId();
  const userMenuPanelMobileId = `${userMenuBaseId}-account-panel-mobile`;
  const userMenuPanelDesktopId = `${userMenuBaseId}-account-panel-desktop`;

  const closeMobileNav = useCallback(() => {
    setMobileNavOpen(false);
  }, []);

  const closeMobileTools = useCallback(() => {
    setMobileToolsOpen(false);
  }, []);

  const userMenuOpen = userMenuAnchor != null;

  const closeUserMenu = useCallback(() => {
    setUserMenuAnchor(null);
  }, []);

  const moduleNavItems = useMemo(
    () =>
      MODULE_NAV.map((item) => ({
        ...item,
        locked: !hasCapability(workspaceAccess.capabilities, item.capability),
      })),
    [workspaceAccess.capabilities],
  );

  const canUsePharmacySearch =
    hasCapability(workspaceAccess.capabilities, "stock") ||
    hasCapability(workspaceAccess.capabilities, "staff") ||
    hasCapability(workspaceAccess.capabilities, "catalog");

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      closeMobileNav();
      closeMobileTools();
      closeUserMenu();
    });
    return () => cancelAnimationFrame(id);
  }, [pathname, closeMobileNav, closeMobileTools, closeUserMenu]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      if (mq.matches) {
        closeMobileNav();
        closeMobileTools();
        closeUserMenu();
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [closeMobileNav, closeMobileTools, closeUserMenu]);

  useEffect(() => {
    if (!mobileNavOpen) {
      return;
    }
    document.body.style.overflow = "hidden";
    mobileNavCloseRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMobileNav();
        mobileMenuButtonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileNavOpen, closeMobileNav]);

  useEffect(() => {
    if (!userMenuOpen) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      const mobileRoot = userMenuRootMobileRef.current;
      const desktopRoot = userMenuRootDesktopRef.current;
      const target = event.target;
      if (target instanceof Node) {
        if (mobileRoot?.contains(target) || desktopRoot?.contains(target)) {
          return;
        }
      }
      closeUserMenu();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeUserMenu();
        if (userMenuAnchor === "mobile") {
          userMenuTriggerMobileRef.current?.focus();
        } else if (userMenuAnchor === "desktop") {
          userMenuTriggerDesktopRef.current?.focus();
        }
      }
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [userMenuOpen, userMenuAnchor, closeUserMenu]);

  useEffect(() => {
    if (!mobileToolsOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMobileTools();
        mobileToolsToggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileToolsOpen, closeMobileTools]);

  useLayoutEffect(() => {
    if (mobileToolsOpen) {
      return;
    }
    const root = mobileToolsPanelRef.current;
    if (!root) {
      return;
    }
    const active = document.activeElement;
    if (active instanceof HTMLElement && root.contains(active)) {
      active.blur();
    }
  }, [mobileToolsOpen]);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) {
      return;
    }
    const measure = () => {
      setHeaderHeightPx(el.getBoundingClientRect().height);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [pathname, mobileNavOpen, mobileToolsOpen, userMenuOpen]);

  const isStock = pathname === ROUTES.dashboard.stock || pathname.startsWith(`${ROUTES.dashboard.stock}/`);
  const isSales = pathname === ROUTES.dashboard.sales || pathname.startsWith(`${ROUTES.dashboard.sales}/`);
  const isInsights =
    pathname === ROUTES.dashboard.insights || pathname.startsWith(`${ROUTES.dashboard.insights}/`);
  const isProductCategories =
    pathname === ROUTES.dashboard.productCategories ||
    pathname.startsWith(`${ROUTES.dashboard.productCategories}/`);
  const isSettings = pathname === ROUTES.settings || pathname.startsWith(`${ROUTES.settings}/`);
  const isOrganization =
    pathname === ROUTES.dashboard.organization
    || pathname.startsWith(`${ROUTES.dashboard.organization}/`);
  const isStaff = pathname === ROUTES.dashboard.staff || pathname.startsWith(`${ROUTES.dashboard.staff}/`);
  const isStaffAdd = pathname === ROUTES.dashboard.staffAdd;
  const isDashboardMain = pathname === ROUTES.dashboard.main;
  const searchPlaceholder = isStock
    ? "Search inventory..."
    : isSales
      ? "Search sales ID, patient, or drug..."
      : isInsights
        ? "Search insights..."
        : isStaff
          ? "Search pharmacy network..."
          : "Search clinical data...";
  const topActionLabel = isStock ? "Aura Sync" : "Branch Toggle";
  const topActionIcon = isStock ? "sync" : "shuffle";
  const topActionVariant = isStock ? "outline" : "primary";
  const sectionBranchTabs = workspaceAccess.accessibleBranches;
  const branchParam = searchParams.get("branch");
  const activeSectionBranchId =
    branchParam && sectionBranchTabs.some((t) => t.id === branchParam)
      ? branchParam
      : sectionBranchTabs[0]?.id;

  useEffect(() => {
    if (!branchParam || sectionBranchTabs.length === 0) {
      return;
    }
    if (sectionBranchTabs.some((t) => t.id === branchParam)) {
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set("branch", sectionBranchTabs[0]!.id);
    params.delete("page");
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname);
  }, [branchParam, pathname, router, searchParams, sectionBranchTabs]);

  function replaceBranchInUrl(branchId: string, opts?: { resetPage?: boolean }) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("branch", branchId);
    if (opts?.resetPage) {
      params.delete("page");
    }
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname);
  }

  const preservedBranch = searchParams.get("branch") ?? undefined;

  function navHref(base: string) {
    return preservedBranch ? `${base}?branch=${preservedBranch}` : base;
  }

  const hasMobileToolsPanel =
    !isSettings
    && !isOrganization
    && !isStaffAdd
    && !isProductCategories
    && (isStaff
      || isInsights
      || isSales
      || isDashboardMain
      || (isStock && !isDashboardMain)
      || (!isStock && !isDashboardMain));

  const mobileHeaderTitle = isSettings
    ? "Profile & Settings"
    : isOrganization
      ? "Organization"
    : isStaffAdd
      ? "Add New Staff"
      : isProductCategories
        ? "Product Categories"
      : isInsights
        ? "Insights"
        : isSales
          ? "Sales"
          : isStaff
            ? "Staff"
            : isStock
              ? "Stock"
              : isDashboardMain
                ? "Home"
                : pathname === ROUTES.dashboard.pay || pathname.startsWith(`${ROUTES.dashboard.pay}/`)
                  ? "Aura Pay"
                  : "Dashboard";

  function branchSwitcherNav(opts: { ariaLabel: string; onSelectBranch: (branchId: string) => void }) {
    if (sectionBranchTabs.length === 0) {
      const moduleCap = dashboardModuleCapabilityForPath(pathname);
      if (moduleCap && !hasCapability(workspaceAccess.capabilities, moduleCap)) {
        return <MissingCapabilityNotice capability={moduleCap} variant="inline" />;
      }
      const canOpenBranchSetup = hasCapability(workspaceAccess.capabilities, "organization");
      return (
        <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--app-text-muted)]">
          <span>No branches available for your account.</span>
          {canOpenBranchSetup ? (
            <Link
              href={ROUTES.dashboard.onboarding.pharmacyDetails}
              className="font-semibold text-[var(--app-link-teal)] underline decoration-[rgba(20,184,166,0.35)]"
            >
              Branch setup
            </Link>
          ) : (
            <span className="text-[var(--app-text-faint)]">
              Ask an organization admin to assign you to a branch or complete branch setup.
            </span>
          )}
        </div>
      );
    }
    return (
      <nav
        className="flex min-w-0 max-w-full flex-wrap items-center gap-x-4 gap-y-2 overflow-x-auto overscroll-x-contain sm:gap-x-6"
        aria-label={opts.ariaLabel}
      >
        {sectionBranchTabs.map((tab) => {
          const active = tab.id === activeSectionBranchId;
          const className = `pb-1.5 pt-1 font-[family-name:var(--font-manrope)] text-sm ${
            active
              ? "border-b-2 border-[var(--app-branch-active-border)] font-semibold text-[var(--app-link-teal)]"
              : "font-normal text-[var(--app-text-muted)] hover:text-[var(--app-header-title)]"
          }`;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => opts.onSelectBranch(tab.id)}
              className={className}
            >
              {tab.name}
            </button>
          );
        })}
      </nav>
    );
  }

  function accountUserMenu(opts: {
    anchor: "mobile" | "desktop";
    rootRef: RefObject<HTMLDivElement | null>;
    triggerRef: RefObject<HTMLButtonElement | null>;
    panelId: string;
    /** Narrower popover on small header; roomier on lg+ */
    variant: "compact" | "comfortable";
  }) {
    const { anchor, rootRef, triggerRef, panelId, variant } = opts;
    const panelWidthClass =
      variant === "compact"
        ? "w-[min(18rem,calc(100vw-2rem))]"
        : "w-[min(20rem,calc(100vw-2rem))]";
    const isThisAnchor = userMenuAnchor === anchor;

    return (
      <div ref={rootRef} className="relative shrink-0">
        <button
          ref={triggerRef}
          type="button"
          className="inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full shadow-[0_0_0_2px_rgba(20,184,166,0.2)] transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-link-teal)]"
          aria-label="Account menu"
          aria-haspopup="menu"
          aria-expanded={isThisAnchor}
          aria-controls={isThisAnchor ? panelId : undefined}
          onClick={() => {
            closeMobileNav();
            closeMobileTools();
            setUserMenuAnchor((current) => (current === anchor ? null : anchor));
          }}
        >
          <AuraAvatar
            name={workspaceAccess.userDisplayName}
            photoUrl={workspaceAccess.userAvatarUrl}
            decorative
            className="size-full min-h-0 min-w-0 rounded-full text-[11px]"
          />
        </button>
        {isThisAnchor ? (
          <div
            id={panelId}
            role="menu"
            aria-label="Account"
            className={`absolute right-0 top-[calc(100%+0.5rem)] z-[130] ${panelWidthClass} origin-top-right rounded-2xl border border-[var(--app-border-ui-soft)] bg-[var(--app-surface)]/95 p-1 shadow-[var(--app-shadow-card)] backdrop-blur-md`}
          >
            <div className="rounded-xl bg-[var(--app-surface-subtle)]/70 p-3">
              <div className="flex items-center gap-3">
                <AuraAvatar
                  name={workspaceAccess.userDisplayName}
                  photoUrl={workspaceAccess.userAvatarUrl}
                  decorative
                  className="size-11 shrink-0 rounded-full text-sm ring-2 ring-[var(--app-surface)]"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-[family-name:var(--font-manrope)] text-sm font-extrabold text-[var(--app-text)]">
                    {workspaceAccess.userDisplayName}
                  </p>
                  <p className="truncate text-xs font-medium text-[var(--app-text-muted)]">
                    {workspaceAccess.membershipRoleLabel}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-1 pt-2">
              <Link
                href={ROUTES.settings}
                role="menuitem"
                onClick={closeUserMenu}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition hover:bg-[var(--app-surface-subtle)]/90 ${
                  isSettings ? "text-[var(--app-link-teal)]" : "text-[var(--app-text)]"
                }`}
              >
                <span
                  className={`material-symbols-outlined notranslate text-xl ${
                    isSettings ? "text-[var(--app-link-teal)]" : "text-[var(--app-text-muted)]"
                  }`}
                >
                  person
                </span>
                <span className="min-w-0 flex-1 text-left">Profile</span>
                <span className="material-symbols-outlined notranslate text-lg text-[var(--app-text-faint)]">
                  chevron_right
                </span>
              </Link>
              <Link
                href={ROUTES.dashboard.organization}
                role="menuitem"
                onClick={closeUserMenu}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition hover:bg-[var(--app-surface-subtle)]/90 ${
                  isOrganization ? "text-[var(--app-link-teal)]" : "text-[var(--app-text)]"
                }`}
              >
                <span
                  className={`material-symbols-outlined notranslate text-xl ${
                    isOrganization ? "text-[var(--app-link-teal)]" : "text-[var(--app-text-muted)]"
                  }`}
                >
                  domain
                </span>
                <span className="min-w-0 flex-1 text-left">Organization</span>
                <span className="material-symbols-outlined notranslate text-lg text-[var(--app-text-faint)]">
                  chevron_right
                </span>
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="aura-landing min-h-dvh bg-[var(--app-canvas)] text-[var(--app-text)]">
      {mobileNavOpen ? (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-[90] bg-black/40 lg:hidden"
          onClick={closeMobileNav}
        />
      ) : null}

      {/* Sidebar: off-canvas below lg */}
      <aside
        id="dashboard-mobile-nav"
        className={`fixed left-0 top-0 z-[100] flex h-dvh w-64 max-w-[min(100vw,20rem)] flex-col border-r border-[var(--app-surface-subtle)] bg-white px-4 pb-4 pt-2 shadow-[4px_0_24px_rgba(15,23,42,0.08)] transition-transform duration-200 ease-out motion-reduce:transition-none lg:z-40 lg:max-w-none lg:translate-x-0 lg:p-4 lg:shadow-none ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--app-border-ui-soft)] pb-2 lg:hidden">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--app-text-muted)]">Menu</span>
          <button
            ref={mobileNavCloseRef}
            type="button"
            data-mobile-nav-close
            aria-label="Close navigation menu"
            onClick={closeMobileNav}
            className="rounded-lg p-2 text-[var(--app-text-muted)] hover:bg-[var(--app-surface-subtle)]"
          >
            <span className="material-symbols-outlined notranslate text-xl">close</span>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain pt-2 lg:pt-0">
          <Link
            href={ROUTES.dashboard.main}
            onClick={closeMobileNav}
            className="flex items-center gap-3 px-2 pb-4 pt-0 lg:pb-8 lg:pt-2"
          >
            <div
              className="flex size-10 items-center justify-center rounded-xl shadow-md"
              style={{
                background:
                  "linear-gradient(135deg, rgb(15, 185, 177) 0%, rgb(99, 102, 241) 100%)",
              }}
            >
              <span className="material-symbols-outlined notranslate text-xl text-white">
                local_pharmacy
              </span>
            </div>
            <br />
            <br />
            <div>
              <p className="bg-gradient-to-r from-[#14b8a6] to-[#6366f1] bg-clip-text font-[family-name:var(--font-manrope)] text-xl font-bold tracking-tight text-transparent">
                AuraPharma
              </p>
              <p className="text-[10px] font-medium uppercase tracking-[-0.05em] text-[var(--app-text-muted)]">
                Clinical Intelligence
              </p>
            </div>
          </Link>

          <nav className="flex flex-col gap-1" aria-label="Product modules">
            {moduleNavItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const href =
                item.href === ROUTES.dashboard.stock ||
                item.href === ROUTES.dashboard.sales ||
                item.href === ROUTES.dashboard.insights ||
                item.href === ROUTES.dashboard.staff ||
                item.href === ROUTES.dashboard.productCategories
                  ? navHref(item.href)
                  : item.href;

              if (item.locked) {
                const label = membershipCapabilityLabel(item.capability);
                return (
                  <button
                    key={item.href}
                    type="button"
                    title={`Locked feature: ${label}. Click to learn more.`}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[var(--app-text-faint)] opacity-70 transition hover:bg-[var(--app-surface-subtle)]/80 hover:text-[var(--app-text-muted)]"
                    onClick={() => {
                      closeMobileNav();
                      setLockedFeature({
                        capability: item.capability,
                        label,
                        moduleLabel: item.label,
                      });
                      notify({
                        variant: "info",
                        title: "Feature locked",
                        description: `“${item.label}” is locked on your plan. See the upgrade options to unlock.`,
                      });
                    }}
                  >
                    <span className="material-symbols-outlined notranslate text-xl">lock</span>
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--app-text-faint)]">
                      Upgrade
                    </span>
                  </button>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={href}
                  onClick={closeMobileNav}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-[var(--app-surface)] text-[var(--app-link-teal)] shadow-sm"
                      : "text-[var(--app-text-muted)] hover:bg-[var(--app-surface-subtle)]/80"
                  }`}
                >
                  <span
                    className={`material-symbols-outlined notranslate text-xl ${active ? "text-[var(--app-link-teal)]" : ""}`}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto shrink-0 border-t border-[var(--app-border-ui-soft)] pt-4">
          <nav className="flex flex-col gap-1" aria-label="Account">
            <Link
              href={ROUTES.features}
              onClick={closeMobileNav}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--app-text-muted)] hover:bg-[var(--app-surface-subtle)]/80"
            >
              <span className="material-symbols-outlined notranslate text-xl">support_agent</span>
              Support
            </Link>
            <Link
              href={apiUrl("/auth/sign-out")}
              prefetch={false}
              onClick={closeMobileNav}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--app-text-muted)] transition hover:bg-[var(--app-surface-subtle)]/80 hover:text-[#dc2626]"
            >
              <span className="material-symbols-outlined notranslate text-xl">logout</span>
              Log out
            </Link>
          </nav>
          <div className="mt-3 rounded-xl bg-[var(--app-surface-subtle)] p-3">
            <div className="flex items-center gap-3">
              <AuraAvatar
                name={workspaceAccess.userDisplayName}
                photoUrl={workspaceAccess.userAvatarUrl}
                decorative
                className="size-8 shrink-0 rounded-full text-[11px] ring-2 ring-[var(--app-surface)]"
              />
              <div className="min-w-0">
                <p className="truncate font-[family-name:var(--font-manrope)] text-xs font-bold text-[var(--app-text)]">
                  {workspaceAccess.userDisplayName}
                </p>
                <p className="text-[10px] font-medium text-[var(--app-text-muted)]">{workspaceAccess.membershipRoleLabel}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Top bar */}
      <header
        ref={headerRef}
        className="fixed left-0 right-0 top-0 z-[110] border-b border-[var(--app-surface-subtle)] bg-[var(--app-surface)]/85 shadow-[var(--app-shadow-card)] backdrop-blur-md lg:left-64 lg:z-30"
      >
        <div className="lg:hidden">
          <div className="mx-auto max-w-[1280px] px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                ref={mobileMenuButtonRef}
                type="button"
                className="shrink-0 rounded-lg p-2 text-[var(--app-text-muted)] hover:bg-[var(--app-surface-subtle)]"
                aria-expanded={mobileNavOpen}
                aria-controls="dashboard-mobile-nav"
                onClick={() => {
                  closeMobileTools();
                  closeUserMenu();
                  setMobileNavOpen((open) => !open);
                }}
              >
                <span className="material-symbols-outlined notranslate text-2xl">
                  {mobileNavOpen ? "close" : "menu"}
                </span>
              </button>
              <p className="min-w-0 flex-1 truncate font-[family-name:var(--font-manrope)] text-base font-bold leading-tight text-[var(--app-header-title)]">
                {mobileHeaderTitle}
              </p>
              {hasMobileToolsPanel ? (
                <button
                  ref={mobileToolsToggleRef}
                  type="button"
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[var(--app-border-ui)] bg-[var(--app-surface)] px-2.5 py-2 text-[var(--app-text-muted)] hover:bg-[var(--app-surface-subtle)]"
                  aria-expanded={mobileToolsOpen}
                  aria-controls="dashboard-mobile-tools"
                  onClick={() => {
                    closeMobileNav();
                    closeUserMenu();
                    setMobileToolsOpen((open) => !open);
                  }}
                >
                  <span className="material-symbols-outlined notranslate text-xl">tune</span>
                  <span className="sr-only">Search and branches</span>
                </button>
              ) : null}
              <div className="flex shrink-0 items-center gap-2 border-l border-[var(--app-surface-subtle)] pl-3">
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-[var(--app-text-muted)] hover:bg-[var(--app-surface-subtle)]"
                  aria-label="Notifications"
                >
                  <span className="material-symbols-outlined notranslate text-xl">
                    notifications
                  </span>
                </button>
                {accountUserMenu({
                  anchor: "mobile",
                  rootRef: userMenuRootMobileRef,
                  triggerRef: userMenuTriggerMobileRef,
                  panelId: userMenuPanelMobileId,
                  variant: "compact",
                })}
              </div>
            </div>
          </div>
          {hasMobileToolsPanel ? (
            <div
              ref={mobileToolsPanelRef}
              id="dashboard-mobile-tools"
              role="region"
              aria-label="Search and branch filters"
              hidden={!mobileToolsOpen}
              className="border-t border-[var(--app-surface-subtle)] px-4 py-3"
            >
              {isStaff || isInsights ? (
                <div className="flex flex-col gap-4">
                  <label className="relative block w-full min-w-0">
                    <span className="material-symbols-outlined notranslate pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-[var(--app-text-faint)]">
                      search
                    </span>
                    <input
                      type="search"
                      placeholder={searchPlaceholder}
                      className="w-full rounded-full border-0 bg-[var(--app-input-bg)] py-2 pl-10 pr-4 text-sm text-[var(--app-text)] placeholder:text-[var(--app-text-faint)] outline-none ring-1 ring-transparent focus:ring-[var(--app-link-teal)]/25"
                    />
                  </label>
                  {branchSwitcherNav({
                    ariaLabel: "Branch filter",
                    onSelectBranch: (branchId) => replaceBranchInUrl(branchId),
                  })}
                </div>
              ) : isSales ? (
                <div className="flex flex-col gap-4">
                  {branchSwitcherNav({
                    ariaLabel: "Active branch context",
                    onSelectBranch: (branchId) => replaceBranchInUrl(branchId),
                  })}
                </div>
              ) : isDashboardMain ? (
                canUsePharmacySearch ? <PharmacySearchField /> : null
              ) : (
                <div className="flex flex-col gap-4">
                  {!isStock && !isSettings && !isOrganization ? (
                    <label className="relative block w-full min-w-0">
                      <span className="material-symbols-outlined notranslate pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-[var(--app-text-faint)]">
                        search
                      </span>
                      <input
                        type="search"
                        placeholder={searchPlaceholder}
                        value={localSearch}
                        onChange={(event) => {
                          setLocalSearch(event.target.value);
                        }}
                        className="w-full rounded-full border-0 bg-[var(--app-input-bg)] py-2 pl-10 pr-4 text-sm text-[var(--app-text)] placeholder:text-[var(--app-text-faint)] outline-none ring-1 ring-transparent focus:ring-[var(--app-link-teal)]/25"
                      />
                    </label>
                  ) : null}
                  {!isDashboardMain
                    ? branchSwitcherNav({
                        ariaLabel: "Active branch context",
                        onSelectBranch: (branchId) =>
                          replaceBranchInUrl(branchId, { resetPage: isStock }),
                      })
                    : null}
                  {!isSales && !isInsights && !isSettings && !isOrganization && !isStaff && !isStaffAdd && !isDashboardMain ? (
                    <button
                      type="button"
                      onClick={async () => {
                        await withLoading(
                          "dashboard-aura-sync",
                          "Syncing inventory across branches...",
                          async () => {
                            await new Promise((r) => setTimeout(r, 800));
                            notify({
                              variant: "success",
                              title: "Sync complete",
                              description: "All branches are up to date.",
                            });
                          },
                        );
                      }}
                      className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 font-[family-name:var(--font-manrope)] text-sm ${
                        topActionVariant === "primary"
                          ? "bg-[var(--app-cta-bg)] font-bold text-[var(--app-cta-text)]"
                          : "bg-[var(--app-input-bg)] font-medium text-[var(--app-text)]"
                      }`}
                    >
                      <span className="material-symbols-outlined notranslate text-lg">{topActionIcon}</span>
                      {topActionLabel}
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="hidden lg:block">
          <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
              {isSettings ? (
                <h1 className="font-[family-name:var(--font-manrope)] text-lg font-bold leading-tight text-[var(--app-header-title)] sm:text-lg">
                  Profile & Settings
                </h1>
              ) : isOrganization ? (
                <h1 className="font-[family-name:var(--font-manrope)] text-lg font-bold leading-tight text-[var(--app-header-title)] sm:text-lg">
                  Organization
                </h1>
              ) : isProductCategories ? (
                <h1 className="font-[family-name:var(--font-manrope)] text-lg font-bold leading-tight text-[var(--app-header-title)] sm:text-lg">
                  Product Categories
                </h1>
              ) : isStaffAdd ? (
                <h1 className="font-[family-name:var(--font-manrope)] text-lg font-bold leading-tight text-[var(--app-header-title)] sm:text-lg">
                  Add New Staff
                </h1>
              ) : isStaff || isInsights ? (
                <>
                  <label className="relative hidden w-full min-w-0 sm:block sm:w-64">
                    <span className="material-symbols-outlined notranslate pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-[var(--app-text-faint)]">
                      search
                    </span>
                    <input
                      type="search"
                      placeholder={searchPlaceholder}
                      className="w-full rounded-full border-0 bg-[var(--app-input-bg)] py-2 pl-10 pr-4 text-sm text-[var(--app-text)] placeholder:text-[var(--app-text-faint)] outline-none ring-1 ring-transparent focus:ring-[var(--app-link-teal)]/25"
                    />
                  </label>
                  {branchSwitcherNav({
                    ariaLabel: "Branch filter",
                    onSelectBranch: (branchId) => replaceBranchInUrl(branchId),
                  })}
                </>
              ) : isSales ? (
                <>
                  {branchSwitcherNav({
                    ariaLabel: "Active branch context",
                    onSelectBranch: (branchId) => replaceBranchInUrl(branchId),
                  })}
                </>
              ) : (
                <>
                  {!isStock && !isSettings && !isOrganization ? (
                    isDashboardMain ? (
                      canUsePharmacySearch ? <PharmacySearchField /> : null
                    ) : (
                      <label className="relative block w-full sm:w-64">
                        <span className="material-symbols-outlined notranslate pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-[var(--app-text-faint)]">
                          search
                        </span>
                        <input
                          type="search"
                          placeholder={searchPlaceholder}
                          value={localSearch}
                          onChange={(event) => {
                            setLocalSearch(event.target.value);
                          }}
                          className="w-full rounded-full border-0 bg-[var(--app-input-bg)] py-2 pl-10 pr-4 text-sm text-[var(--app-text)] placeholder:text-[var(--app-text-faint)] outline-none ring-1 ring-transparent focus:ring-[var(--app-link-teal)]/25"
                        />
                      </label>
                    )
                  ) : null}
                  {!isDashboardMain
                    ? branchSwitcherNav({
                        ariaLabel: "Active branch context",
                        onSelectBranch: (branchId) =>
                          replaceBranchInUrl(branchId, { resetPage: isStock }),
                      })
                    : null}
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-transparent pt-2 sm:border-t-0 sm:pt-0">
              {!isSales &&
                !isInsights &&
                !isSettings &&
                !isOrganization &&
                !isProductCategories &&
                !isStaff &&
                !isStaffAdd &&
                !isDashboardMain && (
                <button
                  type="button"
                  onClick={async () => {
                    await withLoading(
                      "dashboard-aura-sync",
                      "Syncing inventory across branches...",
                      async () => {
                        await new Promise((r) => setTimeout(r, 800));
                        notify({
                          variant: "success",
                          title: "Sync complete",
                          description: "All branches are up to date.",
                        });
                      },
                    );
                  }}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-1.5 font-[family-name:var(--font-manrope)] text-sm ${
                    topActionVariant === "primary"
                      ? "bg-[var(--app-cta-bg)] font-bold text-[var(--app-cta-text)]"
                      : "bg-[var(--app-input-bg)] font-medium text-[var(--app-text)]"
                  }`}
                >
                  <span className="material-symbols-outlined notranslate text-lg">{topActionIcon}</span>
                  {topActionLabel}
                </button>
              )}
              <div className="flex items-center gap-2 border-l border-[var(--app-surface-subtle)] pl-4">
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-[var(--app-text-muted)] hover:bg-[var(--app-surface-subtle)]"
                  aria-label="Notifications"
                >
                  <span className="material-symbols-outlined notranslate text-xl">
                    notifications
                  </span>
                </button>
                {accountUserMenu({
                  anchor: "desktop",
                  rootRef: userMenuRootDesktopRef,
                  triggerRef: userMenuTriggerDesktopRef,
                  panelId: userMenuPanelDesktopId,
                  variant: "comfortable",
                })}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="lg:pl-64">
        <div
          style={{
            paddingTop:
              headerHeightPx != null
                ? `${Math.ceil(headerHeightPx) + MAIN_BELOW_HEADER_GAP_PX}px`
                : `calc(max(5.5rem, env(safe-area-inset-top, 0px)) + ${MAIN_BELOW_HEADER_GAP_PX}px)`,
          }}
        >
          {children}
        </div>
      </div>

      {lockedFeature ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(99,102,241,0.12)]">
                <span className="material-symbols-outlined notranslate text-xl text-[#6063ee]">lock</span>
              </div>
              <div className="min-w-0">
                <p className="font-[family-name:var(--font-manrope)] text-lg font-extrabold text-[var(--app-text)]">
                  {lockedFeature.moduleLabel} is locked
                </p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--app-text-secondary)]">
                  Your current plan doesn’t include{" "}
                  <span className="font-semibold text-[var(--app-text)]">{lockedFeature.label}</span>. Upgrade to unlock this
                  module, or ask an organization admin to enable access for your account.
                </p>
                <div className="mt-5 flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setLockedFeature(null)}
                    className="rounded-xl bg-[var(--app-input-bg)] px-4 py-2 text-sm font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-input-focus-bg)]"
                  >
                    Not now
                  </button>
                  {isOrganizationOwnerOrAdmin(workspaceAccess.membershipRole) ? (
                    <Link
                      href={ROUTES.billingPortal}
                      prefetch={false}
                      onClick={() => setLockedFeature(null)}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#0fb9b1] to-[#6366f1] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
                    >
                      <span className="material-symbols-outlined notranslate text-base">upgrade</span>
                      View plans
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 cursor-default"
            onClick={() => setLockedFeature(null)}
          />
        </div>
      ) : null}
    </div>
  );
}
