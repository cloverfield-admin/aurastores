-- Introduce the `expenses` capability and sell the Expenses module in Pro.
--
-- Expenses used to ride on the `pay` capability. That coupling made it unsellable
-- on its own: `pay` also unlocks the Aura Pay wallet and withdrawals (real money
-- movement, Enterprise-only), so putting Expenses in Pro by flipping `pay` would
-- have handed every Pro org the withdrawal rail. Splitting it out is what lets Pro
-- get Expenses and nothing else.

-- Plan features: every plan gets an explicit `expenses` flag. Pro and Enterprise
-- grant it; Free and Basic do not. Enterprise is matched by "not the others" so a
-- plan code added later fails closed rather than silently inheriting the module.
UPDATE "subscription_plan_features" AS spf
SET
  "features" = jsonb_set(spf."features", '{capabilities,expenses}', 'false'::jsonb, true),
  "updated_at" = now()
FROM "subscription_plans" AS p
WHERE spf."plan_id" = p."id" AND p."code" IN ('free', 'basic');
--> statement-breakpoint
UPDATE "subscription_plan_features" AS spf
SET
  "features" = jsonb_set(spf."features", '{capabilities,expenses}', 'true'::jsonb, true),
  "updated_at" = now()
FROM "subscription_plans" AS p
WHERE spf."plan_id" = p."id" AND p."code" IN ('pro', 'enterprise');
--> statement-breakpoint
-- Membership capabilities: backfill `expenses` from whatever `pay` currently says.
--
-- Without this the split silently revokes access. Effective capabilities are
-- role defaults overlaid with this stored JSONB (normalizeStoredCapabilities), and
-- the new `expenses` role default deliberately tracks `pay`'s — so a membership
-- that was explicitly GRANTED `pay` against its role default (a manager, say) has
-- no `expenses` key to overlay, falls back to the role default of false, and loses
-- the module it had yesterday. Copying the stored value across preserves exactly
-- the access each membership has today.
--
-- Rows where `capabilities` is NULL are left alone on purpose: NULL means "derive
-- from role", and writing an object here would freeze today's role defaults into
-- the row forever.
UPDATE "organization_memberships"
SET "capabilities" = jsonb_set("capabilities", '{expenses}', "capabilities" -> 'pay', true),
    "updated_at" = now()
WHERE "capabilities" IS NOT NULL
  AND "capabilities" ? 'pay'
  AND jsonb_typeof("capabilities" -> 'pay') = 'boolean'
  AND NOT ("capabilities" ? 'expenses');
