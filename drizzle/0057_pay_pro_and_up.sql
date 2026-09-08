-- Sell the Aura Pay wallet from Pro up.
--
-- `pay` gates the wallet, withdrawals and the pay dashboard. It was seeded on
-- Enterprise alone (0021) — and Enterprise stopped being self-serve in 0053, so
-- the payment rail sat behind the one tier a customer cannot buy. Collecting
-- mobile money on a sale is `sales`-gated and unaffected; this is the wallet.
--
-- Pro and Enterprise are named explicitly so a plan code added later fails
-- closed. Free and Basic are untouched (they already carry `pay: false`).
-- No membership backfill: owners and admins already hold `pay` by role default,
-- and the plan side is what changes.
UPDATE "subscription_plan_features" AS spf
SET
  "features" = jsonb_set(spf."features", '{capabilities,pay}', 'true'::jsonb, true),
  "updated_at" = now()
FROM "subscription_plans" AS p
WHERE spf."plan_id" = p."id" AND p."code" IN ('pro', 'enterprise');
