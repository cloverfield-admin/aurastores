-- Repair branch staffing columns for databases that missed the 0036 rename.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'branches'
      AND column_name = 'licensed_pharmacist_count'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'branches'
      AND column_name = 'professional_staff_count'
  ) THEN
    ALTER TABLE public.branches
      RENAME COLUMN licensed_pharmacist_count TO professional_staff_count;
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS professional_staff_count integer DEFAULT 1;
--> statement-breakpoint
UPDATE public.branches
SET professional_staff_count = 1
WHERE professional_staff_count IS NULL;
--> statement-breakpoint
ALTER TABLE public.branches
  ALTER COLUMN professional_staff_count SET DEFAULT 1,
  ALTER COLUMN professional_staff_count SET NOT NULL;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'branches'
      AND column_name = 'lead_pharmacist_user_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'branches'
      AND column_name = 'lead_staff_user_id'
  ) THEN
    ALTER TABLE public.branches
      RENAME COLUMN lead_pharmacist_user_id TO lead_staff_user_id;
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS lead_staff_user_id uuid;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'branches'
      AND column_name = 'lead_pharmacist_user_id'
  ) THEN
    UPDATE public.branches
    SET lead_staff_user_id = lead_pharmacist_user_id
    WHERE lead_staff_user_id IS NULL
      AND lead_pharmacist_user_id IS NOT NULL;
  END IF;
END $$;
--> statement-breakpoint
DO $$
DECLARE
  lead_staff_attnum smallint;
BEGIN
  SELECT attnum
  INTO lead_staff_attnum
  FROM pg_attribute
  WHERE attrelid = 'public.branches'::regclass
    AND attname = 'lead_staff_user_id'
    AND NOT attisdropped;

  IF lead_staff_attnum IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = 'public.branches'::regclass
        AND contype = 'f'
        AND conkey = ARRAY[lead_staff_attnum]
        AND confrelid = 'public.users'::regclass
    )
  THEN
    ALTER TABLE public.branches
      ADD CONSTRAINT branches_lead_staff_user_id_users_id_fk
      FOREIGN KEY (lead_staff_user_id)
      REFERENCES public.users(id)
      ON DELETE SET NULL
      ON UPDATE NO ACTION;
  END IF;
END $$;
