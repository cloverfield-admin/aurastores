-- Free: tighten limits (products/salesTransactions/categories -> 10) and unlock the
-- Dashboard by granting the `insights` capability (which also powers the Insights tab).
UPDATE "subscription_plan_features" AS spf
SET
  "features" = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(spf."features", '{limits,products}', '10'::jsonb, true),
        '{limits,salesTransactions}', '10'::jsonb, true),
      '{limits,categories}', '10'::jsonb, true),
    '{capabilities,insights}', 'true'::jsonb, true),
  "updated_at" = now()
FROM "subscription_plans" AS p
WHERE spf."plan_id" = p."id" AND p."code" = 'free';
--> statement-breakpoint
-- Basic: also grant `insights` so the paid tier is never behind Free on the Dashboard.
UPDATE "subscription_plan_features" AS spf
SET
  "features" = jsonb_set(spf."features", '{capabilities,insights}', 'true'::jsonb, true),
  "updated_at" = now()
FROM "subscription_plans" AS p
WHERE spf."plan_id" = p."id" AND p."code" = 'basic';
