import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell } from "@/components/marketing/legal/legal-shell";
import type { LegalHighlight, LegalSection } from "@/components/marketing/legal/legal-shell";
import { ROUTES } from "@/lib/routes";

const pageTitle = "Security";
const pageDescription =
  "How AuraStores protects your store's data — encryption in transit and at rest, role-based access, tenant isolation, and payment security.";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: ROUTES.marketing.security },
  openGraph: { title: pageTitle, description: pageDescription, url: ROUTES.marketing.security },
  twitter: { title: pageTitle, description: pageDescription },
};

const LAST_UPDATED = "8 July 2026";

const HIGHLIGHTS: LegalHighlight[] = [
  {
    icon: "encrypted",
    title: "Encrypted everywhere",
    body: "Every connection uses TLS, and your data is encrypted at rest on our infrastructure.",
  },
  {
    icon: "shield_lock",
    title: "Role-based access",
    body: "Owners decide exactly what each staff member can see and do, per branch.",
  },
  {
    icon: "workspaces",
    title: "Isolated by design",
    body: "Every record is scoped to your organization — one store can never see another's data.",
  },
];

const SECTIONS: LegalSection[] = [
  {
    id: "our-approach",
    title: "Our approach",
    body: (
      <>
        <p>
          AuraStores holds the operational heart of your business — your stock, your sales, your margins,
          your team. We treat that with the seriousness it deserves: security isn&rsquo;t a feature we added,
          it&rsquo;s a constraint we build under. This page describes the concrete measures in place today.
        </p>
        <p>
          It pairs with our <Link href={ROUTES.marketing.privacy}>Privacy policy</Link>, which covers what
          data we collect and why.
        </p>
      </>
    ),
  },
  {
    id: "encryption",
    title: "Encryption in transit and at rest",
    body: (
      <>
        <p>
          All traffic between your devices and AuraStores is encrypted with TLS — there is no unencrypted
          path into the platform. At rest, your data lives on managed cloud infrastructure that encrypts
          storage with industry-standard algorithms such as AES-256.
        </p>
        <p>
          This applies across the platform: the web app, the mobile apps, our APIs, and the services that
          sync your branches.
        </p>
      </>
    ),
  },
  {
    id: "authentication",
    title: "Account security and authentication",
    body: (
      <>
        <ul>
          <li>
            <strong>Passwords are never stored in plain text.</strong> Our authentication provider stores
            only salted password hashes; nobody at AuraStores can read your password.
          </li>
          <li>
            <strong>Email verification</strong> confirms ownership of your address before an account is
            fully active, and password-reset and confirmation links use modern, single-use secure flows.
          </li>
          <li>
            <strong>Sessions are managed centrally</strong>, so signing out and password changes take effect
            across your devices.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "access-control",
    title: "Role-based access control",
    body: (
      <>
        <p>
          Inside a store, access follows roles. Owners and the admins they appoint decide who can ring up
          sales, adjust stock, see reports, or manage staff — and which branches each person can touch.
          Permission checks are enforced on our servers, not just hidden in the interface.
        </p>
        <p>
          When you change someone&rsquo;s role or remove them, the change applies immediately across the web
          and mobile apps.
        </p>
      </>
    ),
  },
  {
    id: "tenant-isolation",
    title: "Data isolation between businesses",
    body: (
      <p>
        AuraStores serves many businesses from shared infrastructure, so isolation is enforced at the data
        layer: every product, sale, expense, and staff record is bound to your organization, and every query
        is scoped to it. There is no code path by which one store&rsquo;s data can be returned to another
        store&rsquo;s account.
      </p>
    ),
  },
  {
    id: "payments",
    title: "Payment security",
    body: (
      <>
        <p>
          Subscription payments are processed by our payment provider, Lipila.{" "}
          <strong>Card numbers and mobile-money PINs never touch AuraStores servers</strong> — we hold only
          transaction references, amounts, and status so your billing history stays accurate.
        </p>
        <p>
          We will never call, text, or email you asking for your password or a mobile-money PIN. If someone
          claiming to be AuraStores does, it&rsquo;s a scam — report it to{" "}
          <a href="mailto:cloverfields.tech@gmail.com">cloverfields.tech@gmail.com</a>.
        </p>
      </>
    ),
  },
  {
    id: "infrastructure",
    title: "Infrastructure and backups",
    body: (
      <>
        <p>
          AuraStores runs on established managed cloud providers — the same class of infrastructure used by
          banks and large-scale software companies — rather than self-managed servers. That gives every layer
          of the platform hardened physical security, network protection, and patching by default.
        </p>
        <p>
          Your data is backed up automatically on a rolling schedule, so a hardware failure doesn&rsquo;t
          become your problem. Offline work queued on your devices (like sales rung up without signal) syncs
          into the same protected environment when you reconnect.
        </p>
      </>
    ),
  },
  {
    id: "operations",
    title: "How we operate",
    body: (
      <ul>
        <li>
          <strong>Least privilege:</strong> internal access to production systems is limited to the people
          who need it to run the service.
        </li>
        <li>
          <strong>Change control:</strong> code changes are reviewed and tested before they ship.
        </li>
        <li>
          <strong>Secrets hygiene:</strong> credentials and keys are stored in managed secret stores, never
          in code.
        </li>
        <li>
          <strong>Monitoring:</strong> we watch for errors and unusual behaviour so problems are caught
          early.
        </li>
      </ul>
    ),
  },
  {
    id: "your-part",
    title: "Your part",
    body: (
      <>
        <p>Security is shared. The measures above protect the platform; these habits protect your account:</p>
        <ul>
          <li>Use a strong, unique password for AuraStores — don&rsquo;t reuse one from another service.</li>
          <li>Give staff the lowest role that lets them do their job, and remove people the day they leave.</li>
          <li>Keep your phone locked and the app updated.</li>
          <li>Never share your password or approve a payment prompt you didn&rsquo;t initiate.</li>
        </ul>
      </>
    ),
  },
  {
    id: "responsible-disclosure",
    title: "Responsible disclosure",
    body: (
      <>
        <p>
          Found a vulnerability? We want to hear about it. Email{" "}
          <a href="mailto:cloverfields.tech@gmail.com">cloverfields.tech@gmail.com</a> with enough detail to
          reproduce the issue, and give us a reasonable window to fix it before any public disclosure.
        </p>
        <p>
          We won&rsquo;t pursue action against good-faith research that respects our users&rsquo; data —
          don&rsquo;t access data that isn&rsquo;t yours, degrade the service, or use social engineering
          against our team or customers.
        </p>
      </>
    ),
  },
];

export default function SecurityPage() {
  return (
    <LegalShell
      eyebrow="Trust"
      title="Security at AuraStores"
      intro="Your store's data is the business. Here's how we protect it — from the connection on your phone to the infrastructure your records live on."
      updated={LAST_UPDATED}
      activePath={ROUTES.marketing.security}
      highlights={HIGHLIGHTS}
      sections={SECTIONS}
      contact={{
        heading: "Report a vulnerability",
        body: "Security researchers are welcome here. If you've found something, tell us privately and we'll act on it fast.",
        email: "cloverfields.tech@gmail.com",
      }}
    />
  );
}
