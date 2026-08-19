-- Re-run 0051's membership backfill for rows written since it landed.
--
-- 0051 introduced the `expenses` capability and copied each membership's stored
-- `pay` value across, so nobody silently lost the module when it was split out.
-- The Go engine, however, did not learn about `expenses` until now: its
-- MergeCapabilities wrote exactly the seven keys it knew, so every membership
-- the engine has created or edited since 17 July went in WITHOUT an `expenses`
-- key — reintroducing the very gap 0051 closed.
--
-- The engine now writes all eight keys, so this is a one-time catch-up for the
-- rows written in between. It is deliberately identical to 0051's third
-- statement, including its guards:
--
--   * `capabilities IS NULL` rows are left alone — NULL means "derive from
--     role", and writing an object would freeze today's role defaults in.
--   * rows that already have `expenses` are left alone, so this is safe to run
--     against a database where 0051 did the work.
UPDATE "organization_memberships"
SET "capabilities" = jsonb_set("capabilities", '{expenses}', "capabilities" -> 'pay', true),
    "updated_at" = now()
WHERE "capabilities" IS NOT NULL
  AND "capabilities" ? 'pay'
  AND jsonb_typeof("capabilities" -> 'pay') = 'boolean'
  AND NOT ("capabilities" ? 'expenses');
