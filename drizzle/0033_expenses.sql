DO $$ BEGIN
  CREATE TYPE "public"."expense_type" AS ENUM ('general', 'restocking', 'charge');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."expense_charge_type" AS ENUM ('momo_sale_fee', 'wallet_withdrawal_fee');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "expenses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "branch_id" uuid NOT NULL,
  "expense_type" "public"."expense_type" NOT NULL,
  "charge_type" "public"."expense_charge_type",
  "amount_cents" integer NOT NULL,
  "currency" varchar(3) DEFAULT 'ZMW' NOT NULL,
  "description" text NOT NULL,
  "expense_date" timestamptz NOT NULL,
  "source_ref" varchar(128),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "expenses"
    ADD CONSTRAINT "expenses_organization_id_organizations_id_fk"
    FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "expenses"
    ADD CONSTRAINT "expenses_branch_id_branches_id_fk"
    FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "expenses_org_branch_date_idx" ON "expenses" USING btree ("organization_id","branch_id","expense_date");
CREATE INDEX IF NOT EXISTS "expenses_org_type_idx" ON "expenses" USING btree ("organization_id","expense_type");
CREATE UNIQUE INDEX IF NOT EXISTS "expenses_org_charge_source_unique" ON "expenses" USING btree ("organization_id","charge_type","source_ref");

