import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell } from "@/components/marketing/legal/legal-shell";
import type { LegalSection } from "@/components/marketing/legal/legal-shell";
import { ROUTES } from "@/lib/routes";

const pageTitle = "Privacy policy";
const pageDescription =
  "How AuraStores collects, uses, and protects the data behind your stores — plainly, and in line with Zambia's Data Protection Act.";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: ROUTES.marketing.privacy },
  openGraph: { title: pageTitle, description: pageDescription, url: ROUTES.marketing.privacy },
  twitter: { title: pageTitle, description: pageDescription },
};

const LAST_UPDATED = "8 July 2026";

const SECTIONS: LegalSection[] = [
  {
    id: "who-we-are",
    title: "Who we are",
    body: (
      <>
        <p>
          AuraStores (&ldquo;AuraStores&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is a mobile-first store
          management platform built for pharmacies, retail shops, and multi-branch chains across Zambia. We
          provide the AuraStores web application at aurastores.app, the AuraStores apps for iOS and Android,
          and the services behind them — inventory, checkout, sales insights, expenses, staff management, and
          multi-branch sync.
        </p>
        <p>
          This policy explains what data we collect when you use AuraStores, why we collect it, who we share
          it with, and the choices you have. It applies to the web app, the mobile apps, and any AuraStores
          service that links to it. We&rsquo;ve written it to be read, not skimmed past — if anything is
          unclear, <a href="mailto:cloverfields.tech@gmail.com">ask us</a>.
        </p>
      </>
    ),
  },
  {
    id: "information-we-collect",
    title: "Information we collect",
    body: (
      <>
        <h3>Account information</h3>
        <p>
          When you create an account we collect your name, email address, and a password. Passwords are
          stored only as salted hashes by our authentication provider — never in plain text, and never
          visible to our team.
        </p>
        <h3>Business and store data</h3>
        <p>
          To run your operation, AuraStores stores the data you and your team put into it: store and branch
          names and locations, business or pharmacy licence details you provide during onboarding, product
          catalogues, stock levels and batches, sales and checkout records, expenses, and subscription
          details.
        </p>
        <h3>Staff information</h3>
        <p>
          Store owners and admins can invite staff. For each staff member we hold the name, email address,
          assigned role, and branch assignments entered by the store&rsquo;s owner or admin.
        </p>
        <h3>Payment information</h3>
        <p>
          Subscription payments are processed by our payment provider, Lipila. When you pay by mobile money
          or card, your payment credentials go to the provider — <strong>we never store card numbers or
          mobile-money PINs</strong>. We keep only transaction references, amounts, and payment status so we
          can show your billing history and reconcile your subscription.
        </p>
        <h3>Device and usage data</h3>
        <p>
          We collect device push-notification tokens (so alerts reach your phone), app version, and standard
          technical logs such as IP address and browser type. We also use privacy-friendly, aggregated web
          analytics to understand how the product is used overall.
        </p>
        <h3>Location</h3>
        <p>
          During onboarding you can pin your store&rsquo;s location on a map. We store that store location.
          We do not track your personal whereabouts.
        </p>
      </>
    ),
  },
  {
    id: "how-we-use-it",
    title: "How we use your information",
    body: (
      <>
        <p>We use the data above to:</p>
        <ul>
          <li>Provide and operate AuraStores — including syncing your stock, sales, and staff context across branches and devices in real time.</li>
          <li>Process subscription payments and manage your plan, trial, and billing history.</li>
          <li>Send transactional messages: receipts, staff invitations, account emails, and the push and in-app notifications you&rsquo;ve enabled (expiry alerts, reorder suggestions, insights digests).</li>
          <li>Generate Aura Insights — analytics computed from your own sales and stock data, for your eyes only.</li>
          <li>Answer support requests and keep the platform secure, including detecting fraud and abuse.</li>
          <li>Improve the product using aggregated, de-identified usage patterns.</li>
          <li>Comply with legal obligations.</li>
        </ul>
        <p>
          <strong>What we don&rsquo;t do:</strong> we never sell your data, we never share your business
          figures with other stores, and we never use your data for third-party advertising.
        </p>
      </>
    ),
  },
  {
    id: "legal-bases",
    title: "Our legal bases",
    body: (
      <>
        <p>
          We process personal data in line with Zambia&rsquo;s Data Protection Act, 2021. Depending on the
          activity, we rely on:
        </p>
        <ul>
          <li><strong>Contract</strong> — most processing is simply what&rsquo;s needed to deliver the service you signed up for.</li>
          <li><strong>Legitimate interests</strong> — keeping the platform secure, preventing abuse, and improving the product in ways you&rsquo;d reasonably expect.</li>
          <li><strong>Consent</strong> — optional communications and notification preferences, which you can withdraw at any time in settings.</li>
          <li><strong>Legal obligation</strong> — where we must retain or disclose records under applicable law.</li>
        </ul>
      </>
    ),
  },
  {
    id: "sharing",
    title: "Who we share data with",
    body: (
      <>
        <p>
          We share data only with the service providers that make AuraStores work, each bound to process it
          solely on our instructions:
        </p>
        <div className="legaltable">
          <table>
            <thead>
              <tr>
                <th>Provider</th>
                <th>What they do for us</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Supabase</td>
                <td>Authentication, database, and file storage for your account and business data.</td>
              </tr>
              <tr>
                <td>Vercel</td>
                <td>Hosting for the web application, plus aggregated web analytics.</td>
              </tr>
              <tr>
                <td>Lipila</td>
                <td>Payment processing for subscriptions — mobile money and card.</td>
              </tr>
              <tr>
                <td>Mailgun</td>
                <td>Delivery of transactional email such as receipts and staff invites.</td>
              </tr>
              <tr>
                <td>Google (FCM)</td>
                <td>Delivery of push notifications to your devices via Firebase Cloud Messaging.</td>
              </tr>
              <tr>
                <td>Google Maps</td>
                <td>Maps and address search when you set your store&rsquo;s location.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Beyond that, we disclose data only if required by law or a valid legal process, or — with notice to
          you — as part of a merger or acquisition in which your data remains protected under this policy. We
          do not share data with advertising networks or data brokers.
        </p>
      </>
    ),
  },
  {
    id: "staff-accounts",
    title: "If your employer added you",
    body: (
      <>
        <p>
          If you use AuraStores because a store owner or admin invited you as staff, the owner of that store
          controls the workspace: they decide your role, what branches you can access, and how long your
          membership lasts. We process your information on their behalf to run the workspace.
        </p>
        <p>
          Questions about your data inside a store&rsquo;s workspace — including correcting or removing it —
          are best directed to the store owner first. You can always contact us too, and we&rsquo;ll help
          route the request.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    title: "How long we keep data",
    body: (
      <>
        <p>
          We keep your data for as long as your account is active. If you cancel or your subscription lapses,
          your business records are retained for a limited wind-down period so you can come back or export
          them, after which they are deleted from our production systems. Backup copies age out on a rolling
          schedule after deletion.
        </p>
        <p>
          Some records — such as payment and tax-relevant transaction history — may be retained longer where
          the law requires it. You can request deletion of your account at any time (see{" "}
          <a href="#your-rights">your rights</a> below).
        </p>
      </>
    ),
  },
  {
    id: "security",
    title: "How we protect it",
    body: (
      <>
        <p>
          Your data is encrypted in transit and at rest, access inside your organization is role-based, and
          every record is scoped to your business — one store can never see another&rsquo;s data. Payment
          credentials never touch our servers.
        </p>
        <p>
          Security gets its own page: read the full picture at{" "}
          <Link href={ROUTES.marketing.security}>Security at AuraStores</Link>.
        </p>
      </>
    ),
  },
  {
    id: "your-rights",
    title: "Your rights and choices",
    body: (
      <>
        <p>Under Zambia&rsquo;s Data Protection Act you have the right to:</p>
        <ul>
          <li><strong>Access</strong> the personal data we hold about you.</li>
          <li><strong>Correct</strong> inaccurate or incomplete data.</li>
          <li><strong>Delete</strong> your data, subject to the legal retention noted above.</li>
          <li><strong>Export</strong> your business data in a usable format.</li>
          <li><strong>Object to or restrict</strong> certain processing, and <strong>withdraw consent</strong> where processing is based on it.</li>
        </ul>
        <p>
          To exercise any of these, email <a href="mailto:cloverfields.tech@gmail.com">cloverfields.tech@gmail.com</a>{" "}
          from the address on your account. We respond within 30 days. If you&rsquo;re not satisfied with our
          answer, you may lodge a complaint with Zambia&rsquo;s Office of the Data Protection Commissioner.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies and on-device storage",
    body: (
      <>
        <p>
          We use essential cookies to keep you signed in — the service doesn&rsquo;t work without them. On
          your device, the app also uses local storage to remember preferences like your theme and to queue
          offline activity (for example, sales rung up without a connection) so it can sync when you&rsquo;re
          back online.
        </p>
        <p>We do not use third-party advertising or cross-site tracking cookies.</p>
      </>
    ),
  },
  {
    id: "children",
    title: "Children",
    body: (
      <p>
        AuraStores is a business tool and is not directed at anyone under 18. We do not knowingly collect
        personal data from children; if you believe a child has provided us data, contact us and we will
        delete it.
      </p>
    ),
  },
  {
    id: "international",
    title: "Where your data lives",
    body: (
      <p>
        AuraStores is operated from Zambia, but like most cloud software we rely on infrastructure providers
        whose servers may be located outside Zambia. Wherever your data is processed, it stays protected
        under this policy and our contracts with those providers, consistent with the Data Protection
        Act&rsquo;s requirements for cross-border transfers.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: (
      <p>
        When we change this policy we&rsquo;ll post the new version here and update the date at the top. For
        material changes we&rsquo;ll also tell you directly — by email or in the app — before they take
        effect. Continuing to use AuraStores after a change means you accept the updated policy.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact us",
    body: (
      <>
        <p>
          For anything privacy-related, email{" "}
          <a href="mailto:cloverfields.tech@gmail.com">cloverfields.tech@gmail.com</a>. For general help, reach{" "}
          <a href="mailto:cloverfields.tech@gmail.com">cloverfields.tech@gmail.com</a>.
        </p>
        <p>
          See also our <Link href={ROUTES.marketing.terms}>Terms of service</Link> and{" "}
          <Link href={ROUTES.marketing.security}>Security</Link> pages.
        </p>
      </>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalShell
      eyebrow="Legal"
      title="Privacy policy"
      intro="Your store's data is your business. This policy explains — plainly — what AuraStores collects, why, who we share it with, and the control you keep over it."
      updated={LAST_UPDATED}
      activePath={ROUTES.marketing.privacy}
      sections={SECTIONS}
      contact={{
        heading: "Questions about your data?",
        body: "Our team reads every privacy request. Write to us from your account email and we'll respond within 30 days.",
        email: "cloverfields.tech@gmail.com",
      }}
    />
  );
}
