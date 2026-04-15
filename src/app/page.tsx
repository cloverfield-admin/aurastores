import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { HomePageHeader } from "@/components/marketing/home-page-header";
import { AURA_ASSETS } from "@/lib/aura-assets";
import { services } from "@/lib/di";
import { ROUTES } from "@/lib/routes";
import { getSiteUrl } from "@/lib/site-url";

const homeTitle = "AuraPharma — Clarity around every prescription";
const homeDescription =
  "A cloud-based pharmacy management platform for inventory, pricing, payments, and every branch.";

export const revalidate = 300;
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: homeTitle },
  description: homeDescription,
  alternates: { canonical: "/" },
  openGraph: {
    title: homeTitle,
    description: homeDescription,
    url: "/",
  },
  twitter: {
    title: homeTitle,
    description: homeDescription,
  },
};

const gradientBtn =
  "relative rounded-xl bg-gradient-to-br from-[#0fb9b1] to-[#6366f1] px-8 py-4 text-center font-bold text-white shadow-[0_20px_25px_-5px_rgba(0,106,101,0.2),0_8px_10px_-6px_rgba(0,106,101,0.2)] transition hover:opacity-95";

function HomeJsonLd() {
  const siteUrl = getSiteUrl();
  const payload = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "AuraPharma",
        url: siteUrl,
      },
      {
        "@type": "WebSite",
        name: "AuraPharma",
        url: siteUrl,
        description: homeDescription,
      },
    ],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}

const zwmFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "ZMW",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export default async function HomePage() {
  const year = new Date().getFullYear();
  const plans = await services.billing.listPublicPlans("ZMW");
  const planOrder = ["free", "basic", "pro", "enterprise"] as const;
  const orderedPlans = [...plans].sort(
    (a, b) => planOrder.indexOf(a.code) - planOrder.indexOf(b.code),
  );

  const capabilityBullets: Array<{
    key: keyof (typeof plans)[number]["features"]["capabilities"];
    label: string;
  }> = [
    { key: "stock", label: "Aura Stock" },
    { key: "sales", label: "Sales Tracking" },
    // { key: "catalog", label: "Product Categories" },
    { key: "insights", label: "Aura Insights" },
    { key: "pay", label: "Aura Pay" },
    { key: "staff", label: "Staff Management" },
    { key: "organization", label: "Organization Controls" },
  ];

  function limitLabel(kind: "products" | "categories" | "salesTransactions", value: number | null | undefined) {
    const suffix = kind === "salesTransactions" ? "Sales Transactions" : kind === "products" ? "Products" : "Categories";
    return value != null ? `${value} ${suffix}` : `Unlimited ${suffix}`;
  }

  function buildPlanBullets(plan: (typeof plans)[number], prev?: (typeof plans)[number]) {
    const out: string[] = [];
    if (prev) {
      out.push(`Everything in ${prev.name}`);
    }

    const caps = plan.features.capabilities;
    const prevCaps = prev?.features.capabilities ?? null;
    for (const item of capabilityBullets) {
      const enabled = Boolean(caps[item.key]);
      const wasEnabled = prevCaps ? Boolean(prevCaps[item.key]) : false;
      if (!enabled) continue;
      if (prev && wasEnabled) continue;
      out.push(item.label);
    }

    const limits = plan.features.limits;

    // Show numeric limits where they apply (and keep parity with previous design).
    out.push(limits.branches != null ? `Multi-branch Sync (Up to ${limits.branches})` : "Multi-branch Sync (Unlimited)");
    out.push(limitLabel("products", limits.products));
    out.push(limitLabel("categories", limits.categories));
    out.push(limitLabel("salesTransactions", limits.salesTransactions));
    out.push(limits.staffUsers != null ? `${limits.staffUsers} Staff Users` : "Unlimited Staff Users");

    // Keep cards even: show a consistent set.
    return out.slice(0, 7);
  }

  return (
    <div className="aura-landing min-h-screen bg-[#f7f9fb] text-[#191c1e]">
      <HomeJsonLd />
      <HomePageHeader />

      <main className="pt-[72px]">
        {/* Hero */}
        <section className="relative overflow-hidden px-4 pb-16 pt-12 sm:px-8 sm:pb-24 sm:pt-16">
          <div
            className="pointer-events-none absolute left-1/2 top-0 size-[500px] -translate-x-1/2 rounded-full opacity-20 blur-[60px]"
            style={{
              background:
                "linear-gradient(135deg, rgb(15, 185, 177) 0%, rgb(99, 102, 241) 100%)",
            }}
            aria-hidden
          />
          <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-6 text-center">
            <div className="rounded-full bg-[rgba(0,106,101,0.1)] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#006a65]">
              The Intelligent Layer
            </div>
            <h1 className="max-w-4xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-6xl md:leading-[1.1] lg:text-7xl lg:leading-[72px]">
              Clarity Around Every{" "}
              <span className="bg-gradient-to-r from-[#0fb9b1] to-[#6366f1] bg-clip-text text-transparent">
                Prescription
              </span>
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-[#3c4948] sm:text-xl">
              A cloud-based pharmacy management platform that gives pharmacies complete
              visibility and control across inventory, pricing, and payments—across every
              branch.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <Link href={ROUTES.auth.register} className={gradientBtn}>
                Get Started for Free
              </Link>
              <Link
                href={ROUTES.demoSuccess}
                className="rounded-xl bg-[#e0e3e5] px-8 py-4 text-center font-bold text-[#191c1e] transition hover:bg-[#d5d8db]"
              >
                Watch Demo
              </Link>
            </div>

            <div className="relative mt-10 w-full max-w-6xl pt-4">
              <div
                className="pointer-events-none absolute inset-0 -z-10 scale-105 rounded-2xl opacity-10 blur-xl"
                style={{
                  background:
                    "linear-gradient(135deg, rgb(15, 185, 177) 0%, rgb(99, 102, 241) 100%)",
                }}
                aria-hidden
              />
              <div className="overflow-hidden rounded-2xl border-4 border-white/50 bg-white p-1 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]">
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-[#0f172a]">
                  <Image
                    src={AURA_ASSETS.heroDashboard}
                    alt="AuraPharma dashboard preview with analytics and inventory"
                    fill
                    className="object-cover object-top"
                    sizes="(max-width: 1280px) 100vw, 1280px"
                    priority
                  />
                  <div
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#f7f9fb] via-transparent to-transparent opacity-40"
                    aria-hidden
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Ecosystem */}
        <section
          id="ecosystem"
          className="scroll-mt-24 bg-[#f2f4f6] px-4 py-20 sm:px-8 sm:py-24"
        >
          <div className="mx-auto max-w-7xl space-y-12">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-[#191c1e] md:text-[30px] md:leading-9">
                The Aura Ecosystem
              </h2>
              <p className="max-w-2xl text-base text-[#3c4948]">
                Integrated modules designed for clinical excellence.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:grid-rows-[auto_auto]">
              <div className="flex flex-col justify-between rounded-xl bg-white p-8 shadow-sm lg:col-span-2">
                <div className="space-y-4">
                  <div className="flex size-12 items-center justify-center rounded-lg bg-[rgba(0,106,101,0.1)]">
                    <span className="material-symbols-outlined notranslate text-[#006a65] text-2xl">
                      inventory_2
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold">Aura Stock</h3>
                  <p className="max-w-xl text-base leading-relaxed text-[#3c4948]">
                    Precision-engineered inventory management with real-time tracking,
                    product-level precision, and automated reordering logic.
                  </p>
                </div>
                <a
                  href="#deep-stock"
                  className="mt-8 inline-flex items-center gap-1 text-sm font-semibold text-[#006a65] hover:underline"
                >
                  Learn more
                  <span className="material-symbols-outlined notranslate text-base">
                    arrow_forward
                  </span>
                </a>
              </div>

              <div className="rounded-xl bg-white p-8 shadow-sm">
                <div className="flex size-12 items-center justify-center rounded-lg bg-[rgba(70,72,212,0.1)]">
                  <span className="material-symbols-outlined notranslate text-[#4648d4] text-2xl">
                    analytics
                  </span>
                </div>
                <h3 className="mt-6 text-2xl font-bold">Aura Sales</h3>
                <p className="mt-2 text-base leading-relaxed text-[#3c4948]">
                  Real-time intelligence dashboards that decode drug performance and patient
                  demand patterns.
                </p>
              </div>

              <div className="rounded-xl bg-white p-8 shadow-sm">
                <div className="flex size-12 items-center justify-center rounded-lg bg-[rgba(242,138,91,0.2)]">
                  <span className="material-symbols-outlined notranslate text-[#c2410c] text-2xl">
                    payments
                  </span>
                </div>
                <h3 className="mt-6 text-2xl font-bold">Aura Pay</h3>
                <p className="mt-2 text-base leading-relaxed text-[#3c4948]">
                  Unified reconciliation for cash, card, and mobile money transactions without
                  the paperwork.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:col-span-2">
                <div className="rounded-xl bg-white p-8 shadow-sm">
                  <h4 className="text-xl font-bold">Aura Insights</h4>
                  <p className="mt-2 text-sm text-[#3c4948]">
                    Predictive analytics for growth.
                  </p>
                </div>
                <div className="rounded-xl bg-white p-8 shadow-sm">
                  <h4 className="text-xl font-bold">Aura Sync</h4>
                  <p className="mt-2 text-sm text-[#3c4948]">
                    Cloud synchronization across all branches.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Deep dives */}
        <section className="space-y-24 bg-[#f7f9fb] px-4 py-20 sm:px-8 sm:py-32">
          <div
            id="deep-stock"
            className="mx-auto flex max-w-7xl scroll-mt-28 flex-col items-center gap-12 lg:flex-row lg:gap-16"
          >
            <div className="flex-1 space-y-6">
              <p className="text-base font-semibold uppercase tracking-[0.1em] text-[#006a65]">
                Precision Control
              </p>
              <h2 className="text-3xl font-extrabold leading-tight md:text-4xl">
                Aura Stock: Master Your Inventory
              </h2>
              <ul className="space-y-6">
                <li className="flex gap-4">
                  <span className="material-symbols-outlined notranslate mt-0.5 shrink-0 text-[#006a65]">
                    verified
                  </span>
                  <div>
                    <p className="text-lg font-bold">Product + Expiry Tracking</p>
                    <p className="mt-1 text-sm leading-relaxed text-[#3c4948]">
                      Automated alerts for nearing expirations to reduce waste and ensure
                      patient safety.
                    </p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className="material-symbols-outlined notranslate mt-0.5 shrink-0 text-[#006a65]">
                    autorenew
                  </span>
                  <div>
                    <p className="text-lg font-bold">Automated Reordering</p>
                    <p className="mt-1 text-sm leading-relaxed text-[#3c4948]">
                      Dynamic stock levels that learn from your sales history to prevent
                      out-of-stock scenarios.
                    </p>
                  </div>
                </li>
              </ul>
            </div>
            <div className="flex-1 w-full">
              <div className="rounded-2xl bg-[#f2f4f6] p-4">
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl shadow-lg">
                  <Image
                    src={AURA_ASSETS.featurePharmacy}
                    alt="Organized pharmacy shelves with medicine inventory"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto flex max-w-7xl flex-col-reverse items-center gap-12 lg:flex-row lg:gap-16">
            <div className="flex-1 w-full">
              <div className="rounded-2xl bg-[#f2f4f6] p-4">
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl shadow-lg">
                  <Image
                    src={AURA_ASSETS.featureAnalytics}
                    alt="Sales analytics and data visualization"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-6">
              <p className="text-base font-semibold uppercase tracking-[0.1em] text-[#4648d4]">
                Growth Insights
              </p>
              <h2 className="text-3xl font-extrabold leading-tight md:text-4xl">
                Aura Sales: Real-time Intelligence
              </h2>
              <p className="text-base leading-relaxed text-[#3c4948]">
                Stop guessing what&apos;s selling. Our sales intelligence platform provides
                deep-dive analytics into drug performance across different demographics and
                times of day.
              </p>
              <blockquote className="space-y-4 rounded-xl border-l-4 border-[#4648d4] bg-[#f2f4f6] py-6 pl-7 pr-6">
                <p className="text-base font-medium text-[#191c1e]">
                  &ldquo;We increased our margin by 14% in the first quarter just by
                  optimizing our highest-moving drug categories with Aura Insights.&rdquo;
                </p>
                <footer className="text-sm font-semibold text-[#6063ee]">
                  — Dr. Elena Vance, Chief Pharmacist
                </footer>
              </blockquote>
            </div>
          </div>
        </section>

        {/* Network / Solutions */}
        <section
          id="network"
          className="scroll-mt-24 bg-gradient-to-br from-[#0fb9b1] to-[#6366f1] px-4 py-20 sm:px-8 sm:py-24"
        >
          <div className="mx-auto max-w-7xl text-center">
            <h2 className="text-3xl font-extrabold text-white md:text-4xl">
              One Network. Complete Control.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
              Whether you manage three branches or three hundred, Aura Sync ensures every
              patient profile and every tablet is accounted for globally.
            </p>
            <div className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
              {[
                {
                  icon: "star",
                  title: "Centralized Hub",
                  body: "Switch between branch views with a single click in the Aura Toggle.",
                },
                {
                  icon: "sync_alt",
                  title: "Instant Sync",
                  body: "Updates to inventory in Branch A are reflected instantly in Head Office reports.",
                },
                {
                  icon: "shield_lock",
                  title: "Medical Security",
                  body: "HIPAA-compliant, end-to-end encryption for every data byte.",
                },
              ].map((item) => (
                <div key={item.title} className="flex flex-col items-center text-center">
                  <div className="flex size-16 items-center justify-center rounded-full bg-white/20 py-3.5">
                    <span className="material-symbols-outlined notranslate text-3xl text-white">
                      {item.icon}
                    </span>
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-white">{item.title}</h3>
                  <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/70">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section
          id="pricing"
          className="scroll-mt-24 bg-[#f2f4f6] px-4 py-20 sm:px-8 sm:py-32"
        >
          <div className="mx-auto max-w-7xl space-y-12">
            <div className="space-y-4 text-center">
              <p className="text-base font-semibold uppercase tracking-[0.1em] text-[#006a65]">
                Pricing Plans
              </p>
              <h2 className="text-3xl font-extrabold md:text-4xl">
                Scalable Clinical Intelligence
              </h2>
              <p className="mx-auto max-w-xl text-[#3c4948]">
                Transparent pricing designed for every stage of your pharmacy&apos;s growth.
              </p>
            </div>

            <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-4">
              {orderedPlans.map((plan, index) => {
                const prev = index > 0 ? orderedPlans[index - 1] : undefined;
                const monthly = plan.prices.monthly;
                const highlight = plan.code === "pro";
                const wrapper = highlight
                  ? "flex h-full flex-col rounded-2xl bg-gradient-to-br from-[#0fb9b1] to-[#6366f1] p-8 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]"
                  : "flex h-full flex-col rounded-2xl border border-[#bbc9c7] bg-white p-8 shadow-sm";
                const heading = highlight ? "text-xl font-bold text-white" : "text-xl font-bold";
                const subText = highlight ? "text-sm text-white/80" : "text-sm text-[#3c4948]";
                const priceText = highlight
                  ? "pt-4 font-semibold text-white text-[clamp(1.6rem,2.8vw,2.2rem)] leading-none tracking-tight whitespace-nowrap"
                  : "pt-4 font-semibold text-[clamp(1.6rem,2.8vw,2.2rem)] leading-none tracking-tight whitespace-nowrap";
                const divider = highlight ? "border-b border-white/20 pb-8" : "border-b border-[#e2e8f0] pb-8";
                const listText = highlight ? "flex items-center gap-3 text-sm text-white" : "flex items-center gap-3 text-sm";
                const checkColor = highlight ? "text-white" : "text-[#006a65]";
                const cta = highlight
                  ? "block w-full rounded-xl bg-white py-3 text-center font-bold text-[#006a65] shadow-lg transition hover:bg-white/95"
                  : "block w-full rounded-xl border-2 border-[#006a65] py-3.5 text-center font-bold text-[#006a65] transition hover:bg-[#006a65]/5";

                const bullets = buildPlanBullets(plan, prev);

                return (
                  <div key={plan.code} className={plan.code === "pro" ? "relative order-first lg:order-none" : ""}>
                    {plan.code === "pro" ? (
                      <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#4648d4] px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white shadow-lg">
                        Most Popular
                      </div>
                    ) : null}
                    <div className={wrapper}>
                      <div className={`space-y-2 ${divider}`}>
                        <h3 className={heading}>{plan.name}</h3>
                        <p className={subText}>
                          {plan.code === "free"
                            ? "Start with the essentials for a single location."
                            : plan.code === "basic"
                              ? "Built for small teams ready to scale."
                              : plan.code === "pro"
                                ? "Advanced analytics for growing pharmacy networks."
                                : "Best for large networks and custom integrations."}
                        </p>
                        <p className={priceText}>
                          {monthly ? (
                            <>
                              {zwmFormatter.format(monthly.amountCents / 100)}
                              <span
                                className={
                                  highlight
                                    ? "ml-1 align-baseline text-base font-normal text-white/80"
                                    : "ml-1 align-baseline text-base font-normal text-[#3c4948]"
                                }
                              >
                                /month
                              </span>
                            </>
                          ) : (
                            "Custom"
                          )}
                        </p>
                      </div>
                      <ul className="flex flex-1 flex-col gap-4 py-8">
                        {bullets.map((t) => (
                          <li key={t} className={listText}>
                            <span className={`material-symbols-outlined notranslate text-lg ${checkColor}`}>
                              check_circle
                            </span>
                            <span className="min-w-0 break-words">{t}</span>
                          </li>
                        ))}
                      </ul>
                      <Link href={ROUTES.auth.register} className={cta}>
                        {plan.code === "free"
                          ? "Get Started"
                          : plan.code === "enterprise"
                            ? "Contact Sales"
                            : "Choose Plan"}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="flex flex-wrap items-center justify-center gap-2 text-center text-sm text-[#3c4948]">
              <span className="material-symbols-outlined notranslate text-[#006a65] text-lg">
                lock
              </span>
              All plans include 256-bit HIPAA compliant data encryption
            </p>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-4 py-20 sm:px-8 sm:py-32">
          <div className="mx-auto max-w-3xl space-y-8 text-center">
            <h2 className="text-3xl font-extrabold leading-tight sm:text-4xl sm:leading-tight md:text-5xl md:leading-[1.15]">
              Ready to see your pharmacy in a new light?
            </h2>
            <p className="text-lg text-[#3c4948]">
              Join 1,200+ pharmacies using AuraPharma to bring clarity to their clinical and
              financial operations.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <Link
                href={ROUTES.demoSuccess}
                className={`${gradientBtn} px-12 py-5 text-lg shadow-[0_25px_50px_-12px_rgba(0,106,101,0.3)]`}
              >
                Book a Demo
              </Link>
              <Link
                href={ROUTES.auth.register}
                className="rounded-xl bg-[#e0e3e5] px-12 py-5 text-lg font-bold text-[#191c1e] transition hover:bg-[#d5d8db]"
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e2e8f0] bg-[#f8fafc]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-8">
          <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <p className="text-xl font-bold text-[#0f172a]">AuraPharma</p>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-[#64748b]">
                Intelligence for the modern pharmacy.
              </p>
            </div>
            <div>
              <p className="text-sm font-bold text-[#0f172a]">Products</p>
              <ul className="mt-6 space-y-4 text-sm text-[#64748b]">
                {["Aura Stock", "Aura Sales", "Aura Pay", "Aura Insights", "Aura Sync"].map(
                  (label) => (
                    <li key={label}>
                      <a href="#ecosystem" className="hover:text-[#0fb9b1]">
                        {label}
                      </a>
                    </li>
                  ),
                )}
              </ul>
            </div>
            <div>
              <p className="text-sm font-bold text-[#0f172a]">Company</p>
              <ul className="mt-6 space-y-4 text-sm text-[#64748b]">
                <li>
                  <span className="cursor-default">About Us</span>
                </li>
                <li>
                  <span className="cursor-default">Careers</span>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-bold text-[#0f172a]">Legal</p>
              <ul className="mt-6 space-y-4 text-sm text-[#64748b]">
                <li>
                  <span className="cursor-default">Privacy Policy</span>
                </li>
                <li>
                  <span className="cursor-default">Terms of Service</span>
                </li>
                <li>
                  <span className="cursor-default">Security</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="border-t border-[#e2e8f0]">
          <p className="px-4 py-8 text-center text-xs text-[#64748b] sm:px-8">
            © {year} AuraPharma Clinical Intelligence. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
