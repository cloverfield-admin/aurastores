-- Enforce a single unpaid (pending) invoice per organization.

-- Backfill safety: if any organization has multiple pending invoices, expire all but the newest.
WITH ranked AS (
  SELECT
    "id",
    row_number() OVER (PARTITION BY "organization_id" ORDER BY "created_at" DESC) AS rn
  FROM "subscription_invoices"
  WHERE "status" = 'pending'
)
UPDATE "subscription_invoices" si
SET
  "status" = 'expired',
  "updated_at" = now()
FROM ranked r
WHERE si."id" = r."id"
  AND r.rn > 1;

CREATE UNIQUE INDEX "subscription_invoices_org_pending_unique"
  ON "subscription_invoices" ("organization_id")
  WHERE "status" = 'pending';

