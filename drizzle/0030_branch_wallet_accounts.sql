ALTER TYPE "public"."payment_method" ADD VALUE IF NOT EXISTS 'mobile_money';

CREATE TYPE "public"."wallet_status" AS ENUM('active', 'suspended');

CREATE TYPE "public"."wallet_ledger_entry_type" AS ENUM('settlement', 'withdrawal', 'adjustment', 'refund');

CREATE TYPE "public"."wallet_ledger_source_method" AS ENUM('card', 'mobile_money', 'manual');

CREATE TYPE "public"."wallet_ledger_entry_status" AS ENUM('pending', 'posted', 'failed', 'cancelled');

CREATE TABLE "wallet_accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "branch_id" uuid NOT NULL,
  "currency" varchar(3) DEFAULT 'ZMW' NOT NULL,
  "balance_cents" integer DEFAULT 0 NOT NULL,
  "status" "wallet_status" DEFAULT 'active' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "wallet_accounts_org_branch_unique" UNIQUE("organization_id","branch_id")
);

CREATE TABLE "wallet_ledger_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "wallet_id" uuid NOT NULL,
  "organization_id" uuid NOT NULL,
  "branch_id" uuid NOT NULL,
  "payment_id" uuid,
  "entry_type" "wallet_ledger_entry_type" NOT NULL,
  "source_method" "wallet_ledger_source_method" DEFAULT 'manual' NOT NULL,
  "status" "wallet_ledger_entry_status" DEFAULT 'pending' NOT NULL,
  "amount_cents" integer NOT NULL,
  "currency" varchar(3) DEFAULT 'ZMW' NOT NULL,
  "reference" varchar(128),
  "mobile_number" varchar(32),
  "note" text,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "posted_at" timestamp with time zone
);

ALTER TABLE "wallet_accounts" ADD CONSTRAINT "wallet_accounts_organization_id_organizations_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "wallet_accounts" ADD CONSTRAINT "wallet_accounts_branch_id_branches_id_fk"
  FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "wallet_ledger_entries" ADD CONSTRAINT "wallet_ledger_entries_wallet_id_wallet_accounts_id_fk"
  FOREIGN KEY ("wallet_id") REFERENCES "public"."wallet_accounts"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "wallet_ledger_entries" ADD CONSTRAINT "wallet_ledger_entries_organization_id_organizations_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "wallet_ledger_entries" ADD CONSTRAINT "wallet_ledger_entries_branch_id_branches_id_fk"
  FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "wallet_ledger_entries" ADD CONSTRAINT "wallet_ledger_entries_payment_id_payments_id_fk"
  FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;

CREATE INDEX "wallet_accounts_org_idx" ON "wallet_accounts" USING btree ("organization_id");

CREATE INDEX "wallet_accounts_branch_idx" ON "wallet_accounts" USING btree ("branch_id");

CREATE INDEX "wallet_ledger_entries_wallet_created_idx" ON "wallet_ledger_entries" USING btree ("wallet_id","created_at");

CREATE INDEX "wallet_ledger_entries_org_branch_created_idx" ON "wallet_ledger_entries" USING btree ("organization_id","branch_id","created_at");

CREATE INDEX "wallet_ledger_entries_payment_idx" ON "wallet_ledger_entries" USING btree ("payment_id");
