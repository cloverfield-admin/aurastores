import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell } from "@/components/marketing/legal/legal-shell";
import type { LegalSection } from "@/components/marketing/legal/legal-shell";
import { ROUTES } from "@/lib/routes";

const pageTitle = "Terms of service";
const pageDescription =
  "The agreement between you and AuraStores — accounts, plans and billing, your data, acceptable use, and everything in between.";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: ROUTES.marketing.terms },
  openGraph: { title: pageTitle, description: pageDescription, url: ROUTES.marketing.terms },
  twitter: { title: pageTitle, description: pageDescription },
};

const LAST_UPDATED = "21 August 2026";

const SECTIONS: LegalSection[] = [
  {
    id: "the-agreement",
    title: "The agreement",
    body: (
      <>
        <p>
          These terms are a contract between you and AuraStores (&ldquo;AuraStores&rdquo;, &ldquo;we&rdquo;,
          &ldquo;us&rdquo;). By creating an account or using the AuraStores web application, mobile apps, or
          any related service (together, the &ldquo;Service&rdquo;), you agree to them.
        </p>
        <p>
          If you&rsquo;re using AuraStores on behalf of a business — which is what it&rsquo;s built for — you
          confirm you have authority to bind that business, and &ldquo;you&rdquo; means both you and the
          business. If you don&rsquo;t agree with these terms, don&rsquo;t use the Service.
        </p>
      </>
    ),
  },
  {
    id: "the-service",
    title: "The service",
    body: (
      <>
        <p>
          AuraStores is a mobile-first store management platform for pharmacies, retail shops, and
          multi-branch chains. Depending on your plan, the Service includes:
        </p>
        <ul>
          <li><strong>Aura Stock</strong> — real-time inventory, batches, expiry tracking, and reorder suggestions.</li>
          <li><strong>Aura Sales</strong> — checkout and sales dashboards across branches and channels.</li>
          <li><strong>Aura Insights</strong> — analytics and risk signals computed from your own data.</li>
          <li><strong>Aura Sync</strong> — multi-branch, multi-device synchronization with staff roles.</li>
          <li><strong>Aura Pay</strong> — payment tooling, as and when released.</li>
        </ul>
        <p>
          We ship improvements continuously. Features may be added, changed, or retired; if we retire
          something material to your plan, we&rsquo;ll give you reasonable notice.
        </p>
      </>
    ),
  },
  {
    id: "accounts",
    title: "Accounts and eligibility",
    body: (
      <>
        <p>To use AuraStores you must:</p>
        <ul>
          <li>Be at least 18 years old and able to enter a binding contract.</li>
          <li>Register with accurate information and keep it current.</li>
          <li>Keep your password confidential and your devices secure.</li>
        </ul>
        <p>
          You are responsible for all activity under your account. If you suspect unauthorized access, change
          your password immediately and contact{" "}
          <a href="mailto:cloverfields.tech@gmail.com">cloverfields.tech@gmail.com</a>.
        </p>
      </>
    ),
  },
  {
    id: "stores-and-staff",
    title: "Stores, branches, and staff",
    body: (
      <>
        <p>
          The account that creates a store is its owner. Owners (and the admins they appoint) control the
          workspace: branches, staff invitations, roles, and access. Granting someone a role gives them real
          access to your business data — assign roles deliberately and remove staff who leave.
        </p>
        <p>
          Staff members must follow these terms too, and act within the access their store has granted them.
          As between AuraStores and the store, the store is responsible for how its team uses the Service.
        </p>
      </>
    ),
  },
  {
    id: "plans-and-billing",
    title: "Plans, trials, and billing",
    body: (
      <>
        <ul>
          <li>
            <strong>Plans and pricing.</strong> On the web, subscription plans are priced in Zambian
            Kwacha (ZMW) as shown on our <Link href={ROUTES.marketing.pricing}>pricing page</Link>{" "}
            at the time you subscribe. In-app purchases are priced by the app store in your store
            account&rsquo;s currency, and the price and billing period are shown on the purchase screen
            before you confirm. Prices may change; we&rsquo;ll give you at least 30 days&rsquo; notice
            before a change affects your renewal.
          </li>
          <li>
            <strong>Trials.</strong> New stores receive an introductory trial of premium features, and your
            first paid plan starts with a 7-day free trial before regular billing begins. Trials are one per
            store — we may withhold them where we see abuse.
          </li>
          <li>
            <strong>Payment.</strong> How you&rsquo;re billed depends on where you subscribe. On the web,
            subscriptions are billed through our payment provider by mobile money or card, and you authorize
            recurring charges for your plan until you cancel. In our iOS and Android apps, subscriptions are
            sold as in-app purchases and billed by Apple or Google &mdash; see below.
          </li>
          <li>
            <strong>In-app purchases (Apple App Store and Google Play).</strong> Subscriptions bought inside
            the AuraStores mobile apps are auto-renewable subscriptions processed by the app store, not by
            us. Payment is charged to your Apple ID or Google Play account when you confirm the purchase.
            The subscription renews automatically for the same period &mdash; monthly or yearly, as shown on
            the purchase screen &mdash; unless auto-renew is turned off at least 24 hours before the end of
            the current period, and your account is charged for the renewal within the 24 hours before that
            period ends. You can manage your subscription and turn off auto-renew in your Apple ID or Google
            Play account settings; we can&rsquo;t cancel or refund an app store subscription on your behalf.
            If you take a free trial, any unused portion is forfeited when you buy a subscription covering
            the same period. Refunds for these purchases are handled by Apple or Google under their terms.
          </li>
          <li>
            <strong>Renewals and cancellation.</strong> Plans renew automatically at the end of each billing
            period. Cancel a web subscription anytime in settings, or an app store subscription in your Apple
            ID or Google Play account settings; cancellation takes effect at the end of the current period,
            and amounts already paid are non-refundable except where the law says otherwise.
          </li>
          <li>
            <strong>Failed payments.</strong>{" "}
            If a renewal payment fails we&rsquo;ll retry and notify you.
            While unpaid, your store may be downgraded to free-plan features; your data stays intact per our{" "}
            <Link href={ROUTES.marketing.privacy}>Privacy policy</Link> retention terms.
          </li>
          <li>
            <strong>Taxes.</strong> Prices include applicable taxes unless stated otherwise at checkout.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "your-data",
    title: "Your content and data",
    body: (
      <>
        <p>
          <strong>Your business data is yours.</strong> Products, stock, sales, expenses, staff records —
          everything you put into AuraStores belongs to you. You grant us only the licence we need to host,
          process, back up, and display that data in order to run the Service for you.
        </p>
        <p>
          We use your data to operate the Service as described in our{" "}
          <Link href={ROUTES.marketing.privacy}>Privacy policy</Link> — never to sell it, and never to share
          your figures with other stores. You can export your data at any time, and you&rsquo;re responsible
          for the accuracy and lawfulness of what you and your team enter.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    body: (
      <>
        <p>Don&rsquo;t use AuraStores to:</p>
        <ul>
          <li>Sell or manage goods that are illegal to sell, or run any unlawful operation.</li>
          <li>Break the law, infringe others&rsquo; rights, or misrepresent records to defraud customers, suppliers, auditors, or authorities.</li>
          <li>Probe, disrupt, or overload the Service, or attempt to access another store&rsquo;s data.</li>
          <li>Reverse engineer, copy, resell, or white-label the Service without our written agreement.</li>
          <li>Share accounts or circumvent role-based access controls.</li>
        </ul>
        <p>We may suspend or terminate accounts that break these rules — see below.</p>
      </>
    ),
  },
  {
    id: "regulated-businesses",
    title: "Regulated businesses",
    body: (
      <>
        <p>
          Many AuraStores customers run regulated operations such as pharmacies. AuraStores is a management
          tool, not a compliance service: <strong>you remain solely responsible</strong> for holding valid
          licences and complying with the rules that govern your business — including, for Zambian
          pharmacies, requirements of regulators such as ZAMRA and the Health Professions Council of Zambia.
        </p>
        <p>
          Aura Insights, reorder suggestions, and expiry alerts are aids to your judgment, not professional,
          medical, or regulatory advice. Verify before you act on them.
        </p>
      </>
    ),
  },
  {
    id: "availability",
    title: "Availability and offline mode",
    body: (
      <>
        <p>
          We work to keep AuraStores fast and available, but no cloud service can promise zero interruptions.
          Maintenance, upgrades, and events outside our control may occasionally affect access.
        </p>
        <p>
          The apps are built for real shop-floor conditions: work captured offline (like sales rung up
          without signal) is queued on your device and synced when you reconnect. Until a device syncs, its
          latest records exist only on that device — keep the app updated and give it a chance to sync before
          relying on cross-branch reports.
        </p>
      </>
    ),
  },
  {
    id: "intellectual-property",
    title: "Intellectual property",
    body: (
      <>
        <p>
          The Service — its software, design, and the AuraStores name and marks — belongs to us and our
          licensors. These terms give you a limited, non-exclusive, non-transferable right to use it for your
          business while your account is in good standing; they don&rsquo;t transfer any ownership.
        </p>
        <p>
          If you send us feedback or suggestions, you agree we can use them to improve the Service without
          obligation to you.
        </p>
      </>
    ),
  },
  {
    id: "termination",
    title: "Suspension and termination",
    body: (
      <>
        <p>
          You can stop using AuraStores and delete your account at any time. We may suspend or terminate your
          access if you materially breach these terms, don&rsquo;t pay, or use the Service unlawfully — where
          practical, we&rsquo;ll warn you and give you a chance to fix the problem first.
        </p>
        <p>
          After termination, your data is handled per the retention terms in our{" "}
          <Link href={ROUTES.marketing.privacy}>Privacy policy</Link>, including a wind-down window to export
          it. Sections of these terms that by nature should survive (like ownership, disclaimers, and
          liability limits) survive termination.
        </p>
      </>
    ),
  },
  {
    id: "disclaimers",
    title: "Disclaimers and liability",
    body: (
      <>
        <p>
          The Service is provided <strong>&ldquo;as is&rdquo; and &ldquo;as available&rdquo;</strong>. To the
          fullest extent the law allows, we disclaim implied warranties of merchantability, fitness for a
          particular purpose, and non-infringement. Business decisions you make using AuraStores — pricing,
          purchasing, staffing, dispensing — are yours.
        </p>
        <p>
          To the fullest extent the law allows, neither party is liable for indirect or consequential losses
          (including lost profits or lost data beyond our backup obligations), and our total liability under
          these terms is capped at the fees you paid us in the 12 months before the claim arose. Nothing in
          these terms excludes liability that cannot be excluded by law.
        </p>
      </>
    ),
  },
  {
    id: "governing-law",
    title: "Governing law",
    body: (
      <p>
        These terms are governed by the laws of the Republic of Zambia, and disputes fall under the exclusive
        jurisdiction of the courts of Zambia. Before going to court, contact us at{" "}
        <a href="mailto:cloverfields.tech@gmail.com">cloverfields.tech@gmail.com</a> — most issues are resolved with a
        conversation.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to these terms",
    body: (
      <p>
        We may update these terms as the Service evolves. For material changes we&rsquo;ll notify you — by
        email or in the app — at least 14 days before they take effect. Continuing to use AuraStores after
        that date means you accept the updated terms; if you don&rsquo;t, cancel before they take effect.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact us",
    body: (
      <>
        <p>
          Questions about these terms? Email{" "}
          <a href="mailto:cloverfields.tech@gmail.com">cloverfields.tech@gmail.com</a>.
        </p>
        <p>
          See also our <Link href={ROUTES.marketing.privacy}>Privacy policy</Link> and{" "}
          <Link href={ROUTES.marketing.security}>Security</Link> pages.
        </p>
      </>
    ),
  },
];

export default function TermsOfServicePage() {
  return (
    <LegalShell
      eyebrow="Legal"
      title="Terms of service"
      intro="The plain-language agreement for running your stores on AuraStores — what you can expect from us, and what we ask of you."
      updated={LAST_UPDATED}
      activePath={ROUTES.marketing.terms}
      sections={SECTIONS}
      contact={{
        heading: "Questions about these terms?",
        body: "Most questions have quick answers. Reach out before anything becomes a problem — we read everything.",
        email: "cloverfields.tech@gmail.com",
      }}
    />
  );
}
