-- Verify why the app shows N branches for a user.
-- Replace :email, or replace placeholders with literal UUIDs from your DB.
--
-- 1) App user id (must match Supabase auth.users.id and users.id)
-- SELECT id, email FROM users WHERE lower(email) = lower(:email);
--
-- 2) Membership row used by the app (default first, else any — see findDefaultMembership in auth.repository.impl.ts)
-- SELECT om.id, om.organization_id, om.role, om.is_default, om.status
-- FROM organization_memberships om
-- WHERE om.user_id = '<users.id from step 1>';
--
-- 3) Mirror of selectAllowedBranchIdsForUser (same filters as production)
-- Replace <USER_ID> and <ORG_ID> from steps 1–2.

SELECT
  bsa.branch_id,
  bsa.status,
  bsa.unassigned_at,
  b.organization_id,
  b.name AS branch_name
FROM branch_staff_assignments AS bsa
INNER JOIN branches AS b ON b.id = bsa.branch_id
WHERE bsa.user_id = '<USER_ID>'
  AND b.organization_id = '<ORG_ID>'
  AND bsa.status = 'active'
  AND bsa.unassigned_at IS NULL;

-- 4) All assignments for this user (ignores org) — spot wrong user_id / wrong branch org
-- SELECT bsa.*, b.organization_id AS branch_org
-- FROM branch_staff_assignments AS bsa
-- INNER JOIN branches AS b ON b.id = bsa.branch_id
-- WHERE bsa.user_id = '<USER_ID>';

-- If step 3 returns 0 rows but you expect access: fix bsa.user_id, branch org, status, or unassigned_at.
-- If step 3 returns many rows (e.g. after migration 0015) but UI should show fewer: delete or unassign
-- the extra rows in branch_staff_assignments for that user/branch.
