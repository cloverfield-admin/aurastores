-- Enterprise is negotiated, not bought from a pricing page.
--
-- It is currently `is_public = true` with active ZMW prices for every interval,
-- which means it is listed to customers and a checkout against it would be
-- quoted and charged like any other plan. Nobody intends that: the portal shows
-- Enterprise as "Contact sales", and the engine now refuses it in StartCheckout.
-- This makes the data agree with both.
--
-- The plan row itself stays. Orgs already on Enterprise keep their plan, their
-- entitlements and their history; it simply stops being self-serviceable.
UPDATE "subscription_plans"
SET "is_public" = false, "updated_at" = now()
WHERE "code" = 'enterprise' AND "is_public" = true;
--> statement-breakpoint
-- Close the active price rows rather than deleting them, matching how
-- UpsertPlanPrice retires a price: history stays readable, and any invoice that
-- already referenced one still reconciles.
UPDATE "subscription_plan_prices" AS pp
SET "is_active" = false, "effective_to" = now(), "updated_at" = now()
FROM "subscription_plans" AS p
WHERE p."id" = pp."plan_id"
  AND p."code" = 'enterprise'
  AND pp."is_active" = true
  AND pp."effective_to" IS NULL;
