-- `insights` means forecasting again: Pro and up only.
--
-- Migration 0044 granted `insights` to Free and Basic to unlock the home
-- dashboard, because one flag gated both the dashboard and the demand-forecast
-- tab. That handed Free the forecasts Pro is marketed on ("Advanced analytics";
-- the app's paywall says forecasts are "part of the Pro plan") and the weekly
-- forecast digest went to every store regardless of plan.
--
-- The engine now gates the dashboard on `financials`, which every plan holds by
-- construction (it is a membership capability, never a plan one), so `insights`
-- can go back to meaning what it says. Enterprise is named explicitly rather
-- than matched as "not the others" so a plan code added later fails closed.
--
-- No membership backfill: role-level `insights` is untouched; effective access
-- is membership ∩ plan, and the plan side is what changes here.
UPDATE "subscription_plan_features" AS spf
SET
  "features" = jsonb_set(spf."features", '{capabilities,insights}', 'false'::jsonb, true),
  "updated_at" = now()
FROM "subscription_plans" AS p
WHERE spf."plan_id" = p."id" AND p."code" IN ('free', 'basic');
--> statement-breakpoint
UPDATE "subscription_plan_features" AS spf
SET
  "features" = jsonb_set(spf."features", '{capabilities,insights}', 'true'::jsonb, true),
  "updated_at" = now()
FROM "subscription_plans" AS p
WHERE spf."plan_id" = p."id" AND p."code" IN ('pro', 'enterprise');
