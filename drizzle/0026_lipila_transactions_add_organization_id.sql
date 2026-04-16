-- Tie Lipila transactions to an organization for easier auditing & querying.

ALTER TABLE "lipila_transactions"
ADD COLUMN IF NOT EXISTS "organization_id" uuid;

UPDATE "lipila_transactions" t
SET "organization_id" = i."organization_id"
FROM "subscription_invoices" i
WHERE i."id" = t."invoice_id"
  AND t."organization_id" IS NULL;

ALTER TABLE "lipila_transactions"
ALTER COLUMN "organization_id" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "lipila_transactions_org_created_idx"
ON "lipila_transactions" ("organization_id","created_at");

ALTER TABLE "lipila_transactions"
ADD CONSTRAINT "lipila_transactions_organization_id_organizations_id_fk"
FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE cascade;

