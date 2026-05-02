-- Replace platform admin role label: aurapharma_admin -> aurastores_admin (enum swap).
CREATE TYPE "app_role__new" AS ENUM (
  'owner',
  'admin',
  'aurastores_admin',
  'manager',
  'pharmacist',
  'cashier',
  'analyst'
);

ALTER TABLE "organization_memberships" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "branch_staff_assignments" ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "organization_memberships"
  ALTER COLUMN "role" TYPE "app_role__new"
  USING (
    CASE "role"::text
      WHEN 'aurapharma_admin' THEN 'aurastores_admin'
      ELSE "role"::text
    END
  )::"app_role__new";

ALTER TABLE "branch_staff_assignments"
  ALTER COLUMN "role" TYPE "app_role__new"
  USING (
    CASE "role"::text
      WHEN 'aurapharma_admin' THEN 'aurastores_admin'
      ELSE "role"::text
    END
  )::"app_role__new";

ALTER TABLE "staff_invitations"
  ALTER COLUMN "app_role" TYPE "app_role__new"
  USING (
    CASE "app_role"::text
      WHEN 'aurapharma_admin' THEN 'aurastores_admin'
      ELSE "app_role"::text
    END
  )::"app_role__new";

ALTER TABLE "organization_memberships" ALTER COLUMN "role" SET DEFAULT 'pharmacist';
ALTER TABLE "branch_staff_assignments" ALTER COLUMN "role" SET DEFAULT 'pharmacist';

DROP TYPE "app_role";
ALTER TYPE "app_role__new" RENAME TO "app_role";
