-- Monthly revenue targets, sales streaks and the team leaderboard.
--
-- `branch_monthly_targets` is the only new state: the streak and the leaderboard
-- are derived from `sales` on read (no denormalised counters to drift).
--
-- One row per (branch, month). `month` is the FIRST DAY of the target month in
-- the branch's own timezone — the engine measures progress over branch-local day
-- windows, so a UTC-anchored month would drift for any non-UTC branch.
CREATE TABLE IF NOT EXISTS "branch_monthly_targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"month" date NOT NULL,
	"amount_cents" integer NOT NULL,
	"show_to_staff" boolean DEFAULT true NOT NULL,
	"set_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "branch_monthly_targets" ADD CONSTRAINT "branch_monthly_targets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "branch_monthly_targets" ADD CONSTRAINT "branch_monthly_targets_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "branch_monthly_targets" ADD CONSTRAINT "branch_monthly_targets_set_by_user_id_users_id_fk" FOREIGN KEY ("set_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "branch_monthly_targets_branch_month_unique" ON "branch_monthly_targets" USING btree ("branch_id","month");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "branch_monthly_targets_org_month_idx" ON "branch_monthly_targets" USING btree ("organization_id","month");
--> statement-breakpoint

-- Streaks and the leaderboard scan completed sales by branch and day. The existing
-- partial index is organization-first (`sales_org_completed_created_idx`), which
-- can't serve a single-branch day scan. Add the branch-first equivalent.
CREATE INDEX IF NOT EXISTS "sales_branch_completed_created_idx" ON "sales" USING btree ("branch_id","created_at") WHERE "sales"."status" = 'completed';
--> statement-breakpoint

-- Timezone backfill (REQUIRED for the daily briefing to be a *morning* briefing).
--
-- `branches.timezone` has defaulted to 'UTC' since it was introduced, so every
-- existing row is 'UTC'. The daily-briefing and streak-at-risk sweeps deliver at a
-- branch-LOCAL hour and bucket days in branch-local time; left as 'UTC' a "07:00"
-- briefing would land at 09:00 in Lusaka (UTC+2) and the streak day boundary would
-- be wrong by two hours. Zambia is the only market today and has no DST.
UPDATE "branches" SET "timezone" = 'Africa/Lusaka' WHERE "country" = 'ZM' AND ("timezone" = 'UTC' OR "timezone" = '');
--> statement-breakpoint
ALTER TABLE "branches" ALTER COLUMN "timezone" SET DEFAULT 'Africa/Lusaka';
