-- Annual billing: two months free (pay for ten).
--
-- Yearly was seeded at exactly 12 × monthly (0021), so every annual affordance
-- in the portal was dormant: annualSaving() returns null at 12×, the checkout's
-- "Annual discount · N months free" line never rendered, the overview's
-- "Switch to annual · save N months" button never appeared, and the landing's
-- Monthly/Annual toggle relabelled the same price. The UI for an incentive
-- existed with the incentive set to zero.
--
-- Basic: 3,600 → 3,000 ZMW/year. Pro: 6,000 → 5,000 ZMW/year. Quarterly stays
-- at 3 × monthly. Enterprise's price rows were retired in 0053 and are not
-- touched.
--
-- Close-then-insert, matching UpsertPlanPrice: the current active yearly row is
-- closed (is_active=false, effective_to=now()) and a fresh active row inserted.
-- History stays readable, and any invoice that referenced the old price still
-- reconciles. The admin console could do this too; a migration makes every
-- environment and every fresh database agree without a console step each.
UPDATE "subscription_plan_prices" AS pp
SET "is_active" = false, "effective_to" = now(), "updated_at" = now()
FROM "subscription_plans" AS p
WHERE p."id" = pp."plan_id"
  AND p."code" IN ('basic', 'pro')
  AND pp."currency" = 'ZMW'
  AND pp."interval" = 'yearly'
  AND pp."is_active" = true
  AND pp."effective_to" IS NULL;
--> statement-breakpoint
INSERT INTO "subscription_plan_prices" ("plan_id", "currency", "interval", "amount_cents", "is_active", "effective_from")
SELECT p."id", 'ZMW', 'yearly'::subscription_interval, v.amount_cents, true, now()
FROM "subscription_plans" AS p
JOIN (
  VALUES
    ('basic'::subscription_plan_code, 300000),
    ('pro'::subscription_plan_code, 500000)
) AS v(code, amount_cents) ON v.code = p."code"::subscription_plan_code;
