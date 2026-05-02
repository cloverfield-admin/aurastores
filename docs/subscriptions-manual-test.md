# Subscriptions (Lipila) manual verification checklist

## Setup
- Ensure migrations are applied (`drizzle/0021_subscription_billing.sql`, `drizzle/0022_add_aurapharma_admin_role.sql`).
- Set env:
  - `LIPILA_TILL_NUMBER` (required for `/api/v1/billing/lipila/start`)
  - `LIPILA_CALLBACK_TOKEN` (optional; if set, send it via `Authorization: Bearer ...` or `x-lipila-callback-token`)

## Landing page pricing
- Visit `/` and scroll to **Pricing Plans**.
- Confirm the pricing tiles show **ZMW** prices that match DB active prices.
- Change a price via the admin UI and confirm the landing page updates after revalidation (up to 5 minutes).

## Admin pricing management
- Create a user whose `organization_memberships.role` is `aurastores_admin`.
- Visit `/dashboard/admin/pricing`.
- Verify:
  - Current prices load.
  - Updating an amount creates a new active row and deactivates the prior one.

## Create an invoice + pay instructions
- As any logged-in org user, call `POST /api/v1/billing/invoices` with `{ planCode, interval }`.
- Call `POST /api/v1/billing/lipila/start` with `{ invoiceId }`.
- Verify response contains:
  - `identifier`
  - `ussdDial` formatted like `*488*{till}*{amount}#`

## Lipila callback → activate plan
- Send a callback to `POST /api/v1/billing/lipila/callback` with:
  - `identifier` from the invoice
  - `status: "Successful"`
  - `referenceId` (uuid)
- Verify:
  - `subscription_invoices.status` becomes `paid`
  - `organization_subscriptions.plan_id` updates to the plan from the invoice

## Idempotency
- Re-send the same callback payload again (same `referenceId`).
- Verify:
  - Endpoint returns `{ ok: true }`
  - No duplicate activation occurs (invoice remains paid; subscription remains correct).

## Plan limits (quotas)
- With Free plan:
  - Try to create more than 20 categories: the 21st should be blocked.
  - Try to add staff beyond limit: should be blocked.
  - Try to complete sales beyond limit: should be blocked when creating a completed sale.

## Capability gating
- Ensure a plan without `pay` cannot access Aura Pay areas that are guarded by capability checks.

