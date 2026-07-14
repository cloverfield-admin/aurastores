-- Store billing: Apple / Google in-app purchases, delivered through RevenueCat.
--
-- WHY THIS EXISTS: Apple rejected the iOS app under Guideline 3.1.1 — "the app
-- accesses digital content purchased outside the app, such as subscription plans,
-- but that content isn't available to purchase using In-App Purchase." The B2B
-- carve-out (3.1.3(c)) only covers apps sold exclusively to organizations for their
-- employees; AuraStores is self-serve, so a single-owner shop upgrading is a
-- "single user" sale that must go through IAP.
--
-- Apple also states the remedy (3.1.3(b)): purchases made outside the app may stay
-- accessible AS LONG AS the same plans are also buyable via IAP. So Lipila mobile
-- money survives on the web — mobile just gains a second rail.
--
-- RevenueCat is only a payment + receipt-validation layer. A store purchase
-- activates the SAME `organization_subscriptions` row the Lipila rail activates, so
-- entitlements stay single-sourced in Postgres and nothing downstream has to know
-- how the customer paid.

CREATE TYPE "public"."store_kind" AS ENUM('APP_STORE', 'PLAY_STORE');--> statement-breakpoint
CREATE TYPE "public"."store_environment" AS ENUM('PRODUCTION', 'SANDBOX');--> statement-breakpoint

-- Maps a RevenueCat customer onto the organization whose plan their purchase funds.
--
-- `rc_app_user_id` is the Supabase user id. RevenueCat requires a unique App User ID
-- per PERSON and explicitly forbids org-level identifiers — a shared id would make
-- staff inherit each other's subscriptions. The organization therefore cannot travel
-- on the purchase itself, and this link is the only thing that lets the webhook
-- (which sees nothing but an app_user_id) find the right org.
--
-- Written by the authenticated POST /api/v1/billing/store/sync, where the org is
-- taken from the caller's JWT.
CREATE TABLE IF NOT EXISTS "store_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"rc_app_user_id" varchar(128) NOT NULL,
	"store" "store_kind" NOT NULL,
	"product_id" varchar(128) DEFAULT '' NOT NULL,
	"entitlement_id" varchar(64) DEFAULT '' NOT NULL,
	"plan_id" uuid,
	"period_type" varchar(24) DEFAULT '' NOT NULL,
	"environment" "store_environment" DEFAULT 'PRODUCTION' NOT NULL,
	"original_transaction_id" varchar(128) DEFAULT '' NOT NULL,
	"current_period_end" timestamp with time zone,
	"status" varchar(24) DEFAULT 'active' NOT NULL,
	"raw_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Idempotency ledger for RevenueCat webhooks. RevenueCat REUSES the same event id
-- when it retries, so the unique index below turns a redelivery into a no-op.
-- Without it, a retried INITIAL_PURCHASE would grant a second billing period.
CREATE TABLE IF NOT EXISTS "store_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" varchar(128) NOT NULL,
	"event_type" varchar(48) NOT NULL,
	"app_user_id" varchar(128) DEFAULT '' NOT NULL,
	"raw_payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "store_subscriptions" ADD CONSTRAINT "store_subscriptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_subscriptions" ADD CONSTRAINT "store_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- ON DELETE set null, not restrict: retiring a plan must not be blocked by, or
-- destroy, the historical record of what someone bought.
ALTER TABLE "store_subscriptions" ADD CONSTRAINT "store_subscriptions_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

-- One row per RevenueCat customer: renewals update it in place rather than piling up.
CREATE UNIQUE INDEX IF NOT EXISTS "store_subscriptions_rc_user_unique" ON "store_subscriptions" USING btree ("rc_app_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "store_subscriptions_org_idx" ON "store_subscriptions" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "store_webhook_events_event_id_unique" ON "store_webhook_events" USING btree ("event_id");
