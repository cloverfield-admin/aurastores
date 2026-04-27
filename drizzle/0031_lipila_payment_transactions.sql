CREATE TYPE "public"."lipila_payment_operation" AS ENUM('sale_collection', 'wallet_disbursement');
CREATE TYPE "public"."lipila_payment_status" AS ENUM('pending', 'successful', 'failed');

CREATE TABLE "lipila_payment_transactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "payment_id" uuid,
  "wallet_ledger_entry_id" uuid,
  "operation" "lipila_payment_operation" NOT NULL,
  "reference_id" varchar(128) NOT NULL,
  "identifier" varchar(128),
  "external_id" varchar(128),
  "status" "lipila_payment_status" DEFAULT 'pending' NOT NULL,
  "amount_cents" integer NOT NULL,
  "currency" varchar(3) DEFAULT 'ZMW' NOT NULL,
  "account_number_masked" varchar(32),
  "message" text,
  "raw_payload" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "lipila_payment_transactions"
ADD CONSTRAINT "lipila_payment_transactions_organization_id_organizations_id_fk"
FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "lipila_payment_transactions"
ADD CONSTRAINT "lipila_payment_transactions_payment_id_payments_id_fk"
FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE set null ON UPDATE no action;

ALTER TABLE "lipila_payment_transactions"
ADD CONSTRAINT "lipila_payment_transactions_wallet_ledger_entry_id_wallet_ledger_entries_id_fk"
FOREIGN KEY ("wallet_ledger_entry_id") REFERENCES "wallet_ledger_entries"("id") ON DELETE set null ON UPDATE no action;

CREATE INDEX "lipila_payment_transactions_org_created_idx"
ON "lipila_payment_transactions" ("organization_id","created_at");

CREATE INDEX "lipila_payment_transactions_operation_status_idx"
ON "lipila_payment_transactions" ("operation","status");

CREATE INDEX "lipila_payment_transactions_payment_idx"
ON "lipila_payment_transactions" ("payment_id");

CREATE INDEX "lipila_payment_transactions_wallet_ledger_entry_idx"
ON "lipila_payment_transactions" ("wallet_ledger_entry_id");

CREATE UNIQUE INDEX "lipila_payment_transactions_reference_unique"
ON "lipila_payment_transactions" ("reference_id");
