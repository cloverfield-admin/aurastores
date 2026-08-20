-- Make the `expenses` capability true everywhere it is supposed to be true,
-- without assuming 0051 actually took effect.
--
-- 0051 introduced `expenses` (split out of `pay`, so Pro could buy the Expenses
-- module without also getting the Aura Pay withdrawal rail), set it on every
-- plan, and copied each membership's stored `pay` value across so nobody lost
-- the module in the split. Two things have since gone wrong with that.
--
-- First, 0051's DATA effect is missing in at least one environment even though
-- the Drizzle ledger there claims it ran — the ledger over-reports (it has more
-- entries than production while lacking 0051's result). So the plan half is
-- reapplied here, guarded so it only fills a key that is absent and never
-- overwrites a value somebody set deliberately.
--
-- Second, the Go engine did not learn about `expenses` until now: its
-- MergeCapabilities wrote exactly the seven keys it knew, so every membership
-- the engine created or edited since 17 July went in WITHOUT an `expenses`
-- key — reopening the very gap 0051 closed. The engine now writes all eight;
-- this is the catch-up for the rows written in between.
--
-- Every statement is a no-op where the work is already done, so this is safe to
-- run against a database that is already correct (production is).

-- Plans: Free and Basic do not include Expenses.
UPDATE "subscription_plan_features" AS spf
SET
  "features" = jsonb_set(spf."features", '{capabilities,expenses}', 'false'::jsonb, true),
  "updated_at" = now()
FROM "subscription_plans" AS p
WHERE spf."plan_id" = p."id"
  AND p."code" IN ('free', 'basic')
  AND NOT (spf."features" -> 'capabilities' ? 'expenses');
--> statement-breakpoint
-- Pro and Enterprise do. Enterprise is named explicitly rather than matched by
-- "not the others" so a plan code added later fails closed instead of silently
-- inheriting the module.
UPDATE "subscription_plan_features" AS spf
SET
  "features" = jsonb_set(spf."features", '{capabilities,expenses}', 'true'::jsonb, true),
  "updated_at" = now()
FROM "subscription_plans" AS p
WHERE spf."plan_id" = p."id"
  AND p."code" IN ('pro', 'enterprise')
  AND NOT (spf."features" -> 'capabilities' ? 'expenses');
--> statement-breakpoint
-- Memberships: carry `expenses` over from `pay`, exactly as 0051 did.
--
--   * `capabilities IS NULL` rows are left alone — NULL means "derive from
--     role", and writing an object would freeze today's role defaults in.
--   * rows that already have `expenses` are left alone.
UPDATE "organization_memberships"
SET "capabilities" = jsonb_set("capabilities", '{expenses}', "capabilities" -> 'pay', true),
    "updated_at" = now()
WHERE "capabilities" IS NOT NULL
  AND "capabilities" ? 'pay'
  AND jsonb_typeof("capabilities" -> 'pay') = 'boolean'
  AND NOT ("capabilities" ? 'expenses');
