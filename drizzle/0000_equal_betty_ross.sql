CREATE TYPE "public"."app_role" AS ENUM('owner', 'admin', 'manager', 'pharmacist', 'cashier', 'analyst');--> statement-breakpoint
CREATE TYPE "public"."legal_entity_type" AS ENUM('sole_proprietorship', 'llc', 'corporation', 'partnership', 'nonprofit', 'other');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('invited', 'active', 'suspended', 'removed');--> statement-breakpoint
CREATE TYPE "public"."organization_status" AS ENUM('trial', 'active', 'suspended', 'archived');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('invited', 'active', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."branch_staff_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."branch_status" AS ENUM('draft', 'active', 'inactive', 'syncing');--> statement-breakpoint
CREATE TYPE "public"."branch_type" AS ENUM('main', 'retail', 'warehouse');--> statement-breakpoint
CREATE TYPE "public"."batch_status" AS ENUM('draft', 'active', 'quarantined', 'expired', 'disposed', 'depleted');--> statement-breakpoint
CREATE TYPE "public"."inventory_transaction_type" AS ENUM('receipt', 'sale', 'adjustment', 'transfer_in', 'transfer_out', 'return', 'disposal', 'expiry_write_off');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('active', 'discontinued');--> statement-breakpoint
CREATE TYPE "public"."supplier_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."loyalty_tier" AS ENUM('bronze', 'silver', 'gold', 'platinum');--> statement-breakpoint
CREATE TYPE "public"."patient_gender" AS ENUM('unknown', 'female', 'male', 'other');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('aura_pay_wallet', 'card', 'cash', 'insurance', 'bank_transfer');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid', 'partially_paid', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."prescription_status" AS ENUM('draft', 'active', 'fulfilled', 'partially_fulfilled', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."sale_status" AS ENUM('draft', 'completed', 'voided', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('uploaded', 'under_review', 'approved', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('pharmacy_operation_license', 'pharmacist_in_charge_certificate', 'dea_registration', 'state_board_license', 'liability_insurance', 'other');--> statement-breakpoint
CREATE TYPE "public"."onboarding_status" AS ENUM('draft', 'in_review', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."onboarding_step" AS ENUM('identity', 'pharmacy_details', 'license', 'review');--> statement-breakpoint
CREATE TABLE "organization_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "app_role" DEFAULT 'pharmacist' NOT NULL,
	"status" "membership_status" DEFAULT 'active' NOT NULL,
	"job_title" varchar(128),
	"is_default" boolean DEFAULT false NOT NULL,
	"invited_at" timestamp with time zone DEFAULT now() NOT NULL,
	"joined_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(64) NOT NULL,
	"legal_name" text NOT NULL,
	"display_name" text NOT NULL,
	"legal_entity_type" "legal_entity_type" DEFAULT 'llc' NOT NULL,
	"tax_id" varchar(64) NOT NULL,
	"primary_email" varchar(255) NOT NULL,
	"primary_phone" varchar(32),
	"hq_address_line_1" text NOT NULL,
	"hq_address_line_2" text,
	"hq_city" varchar(128) NOT NULL,
	"hq_state" varchar(128) NOT NULL,
	"hq_postal_code" varchar(32) NOT NULL,
	"hq_country" varchar(2) DEFAULT 'US' NOT NULL,
	"status" "organization_status" DEFAULT 'trial' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"full_name" text NOT NULL,
	"phone" varchar(32),
	"password_hash" text NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"is_email_verified" boolean DEFAULT false NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branch_operating_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"day_of_week" smallint NOT NULL,
	"opens_at" time,
	"closes_at" time,
	"is_closed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branch_staff_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "app_role" DEFAULT 'pharmacist' NOT NULL,
	"status" "branch_staff_status" DEFAULT 'active' NOT NULL,
	"is_lead" boolean DEFAULT false NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unassigned_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"code" varchar(32) NOT NULL,
	"name" text NOT NULL,
	"type" "branch_type" DEFAULT 'retail' NOT NULL,
	"status" "branch_status" DEFAULT 'draft' NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"email" varchar(255),
	"phone" varchar(32),
	"address_line_1" text NOT NULL,
	"address_line_2" text,
	"city" varchar(128) NOT NULL,
	"state" varchar(128) NOT NULL,
	"postal_code" varchar(32) NOT NULL,
	"country" varchar(2) DEFAULT 'US' NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"timezone" varchar(64) DEFAULT 'UTC' NOT NULL,
	"licensed_pharmacist_count" integer DEFAULT 1 NOT NULL,
	"lead_pharmacist_user_id" uuid,
	"opened_at" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"supplier_id" uuid,
	"batch_number" varchar(64) NOT NULL,
	"purchase_order_number" varchar(64),
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"manufactured_at" date,
	"expires_at" date NOT NULL,
	"quantity_received" integer NOT NULL,
	"quantity_available" integer NOT NULL,
	"unit_cost_cents" integer NOT NULL,
	"unit_sale_price_cents" integer,
	"status" "batch_status" DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"batch_id" uuid,
	"performed_by_user_id" uuid,
	"transaction_type" "inventory_transaction_type" NOT NULL,
	"quantity_delta" integer NOT NULL,
	"unit_cost_cents" integer,
	"reference_type" varchar(32),
	"reference_id" uuid,
	"note" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"category_id" uuid,
	"name" text NOT NULL,
	"generic_name" text,
	"strength" varchar(64),
	"dosage_form" varchar(64),
	"manufacturer" text,
	"sku" varchar(64) NOT NULL,
	"barcode" varchar(128),
	"unit_of_measure" varchar(32) DEFAULT 'unit' NOT NULL,
	"requires_prescription" boolean DEFAULT false NOT NULL,
	"is_controlled_substance" boolean DEFAULT false NOT NULL,
	"reorder_level" integer DEFAULT 0 NOT NULL,
	"target_stock_level" integer DEFAULT 0 NOT NULL,
	"default_selling_price_cents" integer DEFAULT 0 NOT NULL,
	"status" "product_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"contact_name" text,
	"email" varchar(255),
	"phone" varchar(32),
	"website" text,
	"tax_id" varchar(64),
	"status" "supplier_status" DEFAULT 'active' NOT NULL,
	"address_line_1" text,
	"address_line_2" text,
	"city" varchar(128),
	"state" varchar(128),
	"postal_code" varchar(32),
	"country" varchar(2) DEFAULT 'US',
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loyalty_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"tier" "loyalty_tier" DEFAULT 'bronze' NOT NULL,
	"points_balance" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loyalty_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"sale_id" uuid,
	"points_delta" integer NOT NULL,
	"reason" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_code" varchar(32) NOT NULL,
	"full_name" text NOT NULL,
	"phone" varchar(32),
	"email" varchar(255),
	"date_of_birth" date,
	"gender" "patient_gender" DEFAULT 'unknown' NOT NULL,
	"notes" text,
	"is_rewards_member" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sale_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"method" "payment_method" NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"reference" varchar(128),
	"amount_cents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"paid_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prescription_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prescription_id" uuid NOT NULL,
	"product_id" uuid,
	"dosage_instructions" text,
	"quantity_prescribed" integer NOT NULL,
	"quantity_dispensed" integer DEFAULT 0 NOT NULL,
	"refills_authorized" integer DEFAULT 0 NOT NULL,
	"refills_remaining" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prescriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"rx_number" varchar(64) NOT NULL,
	"prescriber_name" text,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"status" "prescription_status" DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sale_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sale_id" uuid NOT NULL,
	"product_id" uuid,
	"batch_id" uuid,
	"prescription_item_id" uuid,
	"description" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"tax_rate_bps" integer DEFAULT 0 NOT NULL,
	"discount_cents" integer DEFAULT 0 NOT NULL,
	"line_subtotal_cents" integer NOT NULL,
	"line_total_cents" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"sale_number" varchar(64) NOT NULL,
	"patient_id" uuid,
	"prescription_id" uuid,
	"served_by_user_id" uuid,
	"status" "sale_status" DEFAULT 'draft' NOT NULL,
	"subtotal_cents" integer DEFAULT 0 NOT NULL,
	"tax_cents" integer DEFAULT 0 NOT NULL,
	"discount_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer DEFAULT 0 NOT NULL,
	"payment_status" "payment_status" DEFAULT 'pending' NOT NULL,
	"discount_code" varchar(64),
	"notes" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"branch_id" uuid,
	"uploaded_by_user_id" uuid,
	"document_type" "document_type" NOT NULL,
	"status" "document_status" DEFAULT 'uploaded' NOT NULL,
	"file_name" text NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" varchar(128) NOT NULL,
	"size_bytes" integer NOT NULL,
	"license_number" varchar(128),
	"issuer" text,
	"issued_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"rejection_reason" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_onboarding" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"owner_user_id" uuid,
	"main_branch_id" uuid,
	"current_step" "onboarding_step" DEFAULT 'identity' NOT NULL,
	"furthest_step_index" integer DEFAULT 0 NOT NULL,
	"status" "onboarding_status" DEFAULT 'draft' NOT NULL,
	"submitted_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"review_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_operating_hours" ADD CONSTRAINT "branch_operating_hours_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_staff_assignments" ADD CONSTRAINT "branch_staff_assignments_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_staff_assignments" ADD CONSTRAINT "branch_staff_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_lead_pharmacist_user_id_users_id_fk" FOREIGN KEY ("lead_pharmacist_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_batch_id_inventory_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."inventory_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_performed_by_user_id_users_id_fk" FOREIGN KEY ("performed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_accounts" ADD CONSTRAINT "loyalty_accounts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_accounts" ADD CONSTRAINT "loyalty_accounts_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_ledger" ADD CONSTRAINT "loyalty_ledger_account_id_loyalty_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."loyalty_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_ledger" ADD CONSTRAINT "loyalty_ledger_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_prescription_id_prescriptions_id_fk" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_batch_id_inventory_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."inventory_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_prescription_item_id_prescription_items_id_fk" FOREIGN KEY ("prescription_item_id") REFERENCES "public"."prescription_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_prescription_id_prescriptions_id_fk" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_served_by_user_id_users_id_fk" FOREIGN KEY ("served_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_documents" ADD CONSTRAINT "compliance_documents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_documents" ADD CONSTRAINT "compliance_documents_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_documents" ADD CONSTRAINT "compliance_documents_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_onboarding" ADD CONSTRAINT "organization_onboarding_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_onboarding" ADD CONSTRAINT "organization_onboarding_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_onboarding" ADD CONSTRAINT "organization_onboarding_main_branch_id_branches_id_fk" FOREIGN KEY ("main_branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "organization_memberships_org_user_unique" ON "organization_memberships" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "organization_memberships_org_idx" ON "organization_memberships" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "organization_memberships_user_idx" ON "organization_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_unique" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_tax_id_unique" ON "organizations" USING btree ("tax_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "branch_operating_hours_branch_day_unique" ON "branch_operating_hours" USING btree ("branch_id","day_of_week");--> statement-breakpoint
CREATE UNIQUE INDEX "branch_staff_assignments_branch_user_unique" ON "branch_staff_assignments" USING btree ("branch_id","user_id");--> statement-breakpoint
CREATE INDEX "branch_staff_assignments_branch_idx" ON "branch_staff_assignments" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "branch_staff_assignments_user_idx" ON "branch_staff_assignments" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "branches_org_code_unique" ON "branches" USING btree ("organization_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "branches_org_name_unique" ON "branches" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "branches_org_idx" ON "branches" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "branches_status_idx" ON "branches" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_batches_branch_product_batch_unique" ON "inventory_batches" USING btree ("branch_id","product_id","batch_number");--> statement-breakpoint
CREATE INDEX "inventory_batches_branch_status_idx" ON "inventory_batches" USING btree ("branch_id","status");--> statement-breakpoint
CREATE INDEX "inventory_batches_product_idx" ON "inventory_batches" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "inventory_batches_expiry_idx" ON "inventory_batches" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "inventory_transactions_branch_product_idx" ON "inventory_transactions" USING btree ("branch_id","product_id");--> statement-breakpoint
CREATE INDEX "inventory_transactions_batch_occurred_idx" ON "inventory_transactions" USING btree ("batch_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "product_categories_org_name_unique" ON "product_categories" USING btree ("organization_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "products_org_sku_unique" ON "products" USING btree ("organization_id","sku");--> statement-breakpoint
CREATE UNIQUE INDEX "products_org_barcode_unique" ON "products" USING btree ("organization_id","barcode");--> statement-breakpoint
CREATE INDEX "products_org_idx" ON "products" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "suppliers_org_name_unique" ON "suppliers" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "suppliers_org_idx" ON "suppliers" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "loyalty_accounts_patient_unique" ON "loyalty_accounts" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "loyalty_ledger_account_idx" ON "loyalty_ledger" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "patients_org_patient_code_unique" ON "patients" USING btree ("organization_id","patient_code");--> statement-breakpoint
CREATE INDEX "patients_org_idx" ON "patients" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "payments_sale_idx" ON "payments" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "payments_reference_idx" ON "payments" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "prescription_items_prescription_idx" ON "prescription_items" USING btree ("prescription_id");--> statement-breakpoint
CREATE UNIQUE INDEX "prescriptions_org_rx_number_unique" ON "prescriptions" USING btree ("organization_id","rx_number");--> statement-breakpoint
CREATE INDEX "prescriptions_patient_idx" ON "prescriptions" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "sale_items_sale_idx" ON "sale_items" USING btree ("sale_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_org_sale_number_unique" ON "sales" USING btree ("organization_id","sale_number");--> statement-breakpoint
CREATE INDEX "sales_branch_created_idx" ON "sales" USING btree ("branch_id","created_at");--> statement-breakpoint
CREATE INDEX "sales_patient_idx" ON "sales" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "compliance_documents_org_idx" ON "compliance_documents" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "compliance_documents_type_status_idx" ON "compliance_documents" USING btree ("document_type","status");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_onboarding_org_unique" ON "organization_onboarding" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "organization_onboarding_status_idx" ON "organization_onboarding" USING btree ("status");