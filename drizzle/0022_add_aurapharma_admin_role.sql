-- Add `aurapharma_admin` to app_role in a transaction-safe way.
-- (We avoid ALTER TYPE ... ADD VALUE because that cannot run inside a transaction.)

CREATE TYPE "app_role__new" AS ENUM (
  'owner',
  'admin',
  'aurapharma_admin',
  'manager',
  'pharmacist',
  'cashier',
  'analyst'
);

ALTER TABLE "organization_memberships" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "branch_staff_assignments" ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "organization_memberships"
  ALTER COLUMN "role" TYPE "app_role__new"
  USING ("role"::text::"app_role__new");

ALTER TABLE "branch_staff_assignments"
  ALTER COLUMN "role" TYPE "app_role__new"
  USING ("role"::text::"app_role__new");

ALTER TABLE "staff_invitations"
  ALTER COLUMN "app_role" TYPE "app_role__new"
  USING ("app_role"::text::"app_role__new");

ALTER TABLE "organization_memberships" ALTER COLUMN "role" SET DEFAULT 'pharmacist';
ALTER TABLE "branch_staff_assignments" ALTER COLUMN "role" SET DEFAULT 'pharmacist';

DROP TYPE "app_role";
ALTER TYPE "app_role__new" RENAME TO "app_role";
