-- Free becomes a usable one-person shop, not a demo.
--
-- 0044 tightened Free to 10 products / 10 sales a month / 10 categories. Ten
-- sales a month is about a day of trading, so Free could not run a real shop —
-- it could only show one around, and the 7-day Pro intro trial already does that
-- job. A tier a small shop can actually live on converts when the shop grows;
-- the cap becomes the pitch instead of a wall on day one.
--
-- Staff (1) and branches (1) are unchanged: those are what Basic sells.
-- The sales-limit trigger (0039) reads this JSON live, so the new cap applies
-- to the next completed sale. Mirrors: the engine's FreePlanDefaults and the
-- webapp's free-plan fallbacks move to the same numbers in the same change.
UPDATE "subscription_plan_features" AS spf
SET
  "features" = jsonb_set(
    jsonb_set(
      jsonb_set(spf."features", '{limits,products}', '50'::jsonb, true),
      '{limits,salesTransactions}', '100'::jsonb, true),
    '{limits,categories}', '20'::jsonb, true),
  "updated_at" = now()
FROM "subscription_plans" AS p
WHERE spf."plan_id" = p."id" AND p."code" = 'free';
