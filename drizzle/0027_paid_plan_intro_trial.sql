ALTER TYPE "organization_subscription_status" ADD VALUE IF NOT EXISTS 'trialing';--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "signup_selected_plan_code" varchar(32);--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "paid_intro_trial_started_at" timestamptz;
