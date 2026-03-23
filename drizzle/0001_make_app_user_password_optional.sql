DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'password_hash'
  ) THEN
    EXECUTE 'ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'organizations'
      AND column_name = 'legal_name'
  ) THEN
    EXECUTE 'ALTER TABLE "organizations" ALTER COLUMN "legal_name" DROP NOT NULL';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'organizations'
      AND column_name = 'tax_id'
  ) THEN
    EXECUTE 'ALTER TABLE "organizations" ALTER COLUMN "tax_id" DROP NOT NULL';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'organizations'
      AND column_name = 'hq_address_line_1'
  ) THEN
    EXECUTE 'ALTER TABLE "organizations" ALTER COLUMN "hq_address_line_1" DROP NOT NULL';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'organizations'
      AND column_name = 'hq_city'
  ) THEN
    EXECUTE 'ALTER TABLE "organizations" ALTER COLUMN "hq_city" DROP NOT NULL';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'organizations'
      AND column_name = 'hq_state'
  ) THEN
    EXECUTE 'ALTER TABLE "organizations" ALTER COLUMN "hq_state" DROP NOT NULL';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'organizations'
      AND column_name = 'hq_postal_code'
  ) THEN
    EXECUTE 'ALTER TABLE "organizations" ALTER COLUMN "hq_postal_code" DROP NOT NULL';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'branches'
      AND column_name = 'city'
  ) THEN
    EXECUTE 'ALTER TABLE "branches" ALTER COLUMN "city" DROP NOT NULL';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'branches'
      AND column_name = 'state'
  ) THEN
    EXECUTE 'ALTER TABLE "branches" ALTER COLUMN "state" DROP NOT NULL';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'branches'
      AND column_name = 'postal_code'
  ) THEN
    EXECUTE 'ALTER TABLE "branches" ALTER COLUMN "postal_code" DROP NOT NULL';
  END IF;
END $$;
