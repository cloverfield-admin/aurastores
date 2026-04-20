-- Monthly sales transaction caps: Free 100/mo, Basic 1000/mo (enforced in app by UTC calendar month).
UPDATE "subscription_plan_features" AS spf
SET
  "features" = jsonb_set(spf."features", '{limits,salesTransactions}', '100'::jsonb, true),
  "updated_at" = now()
FROM "subscription_plans" AS p
WHERE spf."plan_id" = p."id" AND p."code" = 'free';

UPDATE "subscription_plan_features" AS spf
SET
  "features" = jsonb_set(spf."features", '{limits,salesTransactions}', '1000'::jsonb, true),
  "updated_at" = now()
FROM "subscription_plans" AS p
WHERE spf."plan_id" = p."id" AND p."code" = 'basic';
