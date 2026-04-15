-- Subscription plans + billing (Lipila)

CREATE TYPE "subscription_plan_code" AS ENUM ('free', 'basic', 'pro', 'enterprise');
CREATE TYPE "subscription_interval" AS ENUM ('monthly', 'quarterly', 'yearly');
CREATE TYPE "organization_subscription_status" AS ENUM ('active', 'past_due', 'canceled', 'pending_payment');
CREATE TYPE "subscription_invoice_status" AS ENUM ('pending', 'paid', 'failed', 'expired');
CREATE TYPE "lipila_transaction_status" AS ENUM ('successful', 'failed');

CREATE TABLE "subscription_plans" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" "subscription_plan_code" NOT NULL,
  "name" varchar(128) NOT NULL,
  "is_public" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "subscription_plans_code_unique" ON "subscription_plans" ("code");
CREATE INDEX "subscription_plans_public_sort_idx" ON "subscription_plans" ("is_public","sort_order");

CREATE TABLE "subscription_plan_features" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "plan_id" uuid NOT NULL REFERENCES "subscription_plans"("id") ON DELETE cascade,
  "features" jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "subscription_plan_features_plan_unique" ON "subscription_plan_features" ("plan_id");

CREATE TABLE "subscription_plan_prices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "plan_id" uuid NOT NULL REFERENCES "subscription_plans"("id") ON DELETE cascade,
  "currency" varchar(3) DEFAULT 'ZMW' NOT NULL,
  "interval" "subscription_interval" NOT NULL,
  "amount_cents" integer NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "effective_from" timestamptz DEFAULT now() NOT NULL,
  "effective_to" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX "subscription_plan_prices_plan_interval_idx" ON "subscription_plan_prices" ("plan_id","interval");
CREATE INDEX "subscription_plan_prices_active_lookup_idx" ON "subscription_plan_prices" ("currency","interval","is_active","effective_from");

CREATE TABLE "organization_subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
  "plan_id" uuid NOT NULL REFERENCES "subscription_plans"("id") ON DELETE restrict,
  "interval" "subscription_interval" DEFAULT 'monthly' NOT NULL,
  "status" "organization_subscription_status" DEFAULT 'active' NOT NULL,
  "current_period_start" timestamptz DEFAULT now() NOT NULL,
  "current_period_end" timestamptz,
  "cancel_at_period_end" boolean DEFAULT false NOT NULL,
  "scheduled_plan_id" uuid REFERENCES "subscription_plans"("id") ON DELETE set null,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "organization_subscriptions_org_unique" ON "organization_subscriptions" ("organization_id");
CREATE INDEX "organization_subscriptions_org_status_idx" ON "organization_subscriptions" ("organization_id","status");

CREATE TABLE "subscription_invoices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
  "plan_id" uuid NOT NULL REFERENCES "subscription_plans"("id") ON DELETE restrict,
  "interval" "subscription_interval" NOT NULL,
  "currency" varchar(3) DEFAULT 'ZMW' NOT NULL,
  "amount_cents" integer NOT NULL,
  "identifier" varchar(128) NOT NULL,
  "status" "subscription_invoice_status" DEFAULT 'pending' NOT NULL,
  "due_at" timestamptz,
  "paid_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX "subscription_invoices_org_status_created_idx" ON "subscription_invoices" ("organization_id","status","created_at");
CREATE UNIQUE INDEX "subscription_invoices_identifier_unique" ON "subscription_invoices" ("identifier");

CREATE TABLE "lipila_transactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "invoice_id" uuid NOT NULL REFERENCES "subscription_invoices"("id") ON DELETE cascade,
  "identifier" varchar(128) NOT NULL,
  "reference_id" uuid,
  "external_id" varchar(128),
  "status" "lipila_transaction_status" NOT NULL,
  "message" text,
  "raw_payload" jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX "lipila_transactions_identifier_idx" ON "lipila_transactions" ("identifier");
CREATE UNIQUE INDEX "lipila_transactions_reference_unique" ON "lipila_transactions" ("reference_id");

-- Seed plans, features, and baseline ZMW pricing.
WITH plans AS (
  INSERT INTO "subscription_plans" ("code","name","is_public","sort_order")
  VALUES
    ('free','Free',true,10),
    ('basic','Basic',true,20),
    ('pro','Pro',true,30),
    ('enterprise','Enterprise',true,40)
  ON CONFLICT ("code") DO UPDATE SET
    "name" = EXCLUDED."name",
    "is_public" = EXCLUDED."is_public",
    "sort_order" = EXCLUDED."sort_order",
    "updated_at" = now()
  RETURNING "id","code"
)
INSERT INTO "subscription_plan_features" ("plan_id","features")
SELECT
  p."id",
  CASE p."code"
    WHEN 'free' THEN jsonb_build_object(
      'capabilities', jsonb_build_object('stock', true, 'sales', true, 'catalog', true, 'insights', false, 'pay', false, 'staff', false, 'organization', true),
      'limits', jsonb_build_object('products', 20, 'salesTransactions', 50, 'categories', 20, 'staffUsers', 1, 'branches', 1)
    )
    WHEN 'basic' THEN jsonb_build_object(
      'capabilities', jsonb_build_object('stock', true, 'sales', true, 'catalog', true, 'insights', false, 'pay', false, 'staff', true, 'organization', true),
      'limits', jsonb_build_object('products', NULL, 'salesTransactions', NULL, 'categories', 20, 'staffUsers', 5, 'branches', 5)
    )
    WHEN 'pro' THEN jsonb_build_object(
      'capabilities', jsonb_build_object('stock', true, 'sales', true, 'catalog', true, 'insights', true, 'pay', false, 'staff', true, 'organization', true),
      'limits', jsonb_build_object('products', NULL, 'salesTransactions', NULL, 'categories', NULL, 'staffUsers', 15, 'branches', 15)
    )
    ELSE jsonb_build_object(
      'capabilities', jsonb_build_object('stock', true, 'sales', true, 'catalog', true, 'insights', true, 'pay', true, 'staff', true, 'organization', true),
      'limits', jsonb_build_object('products', NULL, 'salesTransactions', NULL, 'categories', NULL, 'staffUsers', NULL, 'branches', NULL)
    )
  END
FROM plans p
ON CONFLICT ("plan_id") DO UPDATE SET
  "features" = EXCLUDED."features",
  "updated_at" = now();

-- Pricing seeds (minor units): ZMW amounts without decimals are stored as cents=amount*100 for consistency.
WITH plans AS (
  SELECT "id","code" FROM "subscription_plans"
)
INSERT INTO "subscription_plan_prices" ("plan_id","currency","interval","amount_cents","is_active")
SELECT p."id", 'ZMW', i.interval, i.amount_cents, true
FROM plans p
JOIN (
  VALUES
    ('free'::subscription_plan_code, 'monthly'::subscription_interval, 0),
    ('free'::subscription_plan_code, 'quarterly'::subscription_interval, 0),
    ('free'::subscription_plan_code, 'yearly'::subscription_interval, 0),
    ('basic'::subscription_plan_code, 'monthly'::subscription_interval, 30000),
    ('basic'::subscription_plan_code, 'quarterly'::subscription_interval, 90000),
    ('basic'::subscription_plan_code, 'yearly'::subscription_interval, 360000),
    ('pro'::subscription_plan_code, 'monthly'::subscription_interval, 50000),
    ('pro'::subscription_plan_code, 'quarterly'::subscription_interval, 150000),
    ('pro'::subscription_plan_code, 'yearly'::subscription_interval, 600000),
    ('enterprise'::subscription_plan_code, 'monthly'::subscription_interval, 100000),
    ('enterprise'::subscription_plan_code, 'quarterly'::subscription_interval, 300000),
    ('enterprise'::subscription_plan_code, 'yearly'::subscription_interval, 1200000)
) AS i(code, interval, amount_cents) ON i.code = p."code"::subscription_plan_code
ON CONFLICT DO NOTHING;

-- Backfill: ensure every org has a subscription row (defaults to Free/monthly/active).
INSERT INTO "organization_subscriptions" ("organization_id","plan_id","interval","status")
SELECT o."id", p."id", 'monthly', 'active'
FROM "organizations" o
JOIN "subscription_plans" p ON p."code" = 'free'
LEFT JOIN "organization_subscriptions" s ON s."organization_id" = o."id"
WHERE s."organization_id" IS NULL;

