ALTER TABLE "organizations"
ADD COLUMN IF NOT EXISTS "sales_tax_enabled" boolean NOT NULL DEFAULT false;

ALTER TABLE "organizations"
ADD COLUMN IF NOT EXISTS "sales_tax_rate_bps" integer NOT NULL DEFAULT 0;

ALTER TABLE "organizations"
ADD COLUMN IF NOT EXISTS "stripe_customer_id" text;

