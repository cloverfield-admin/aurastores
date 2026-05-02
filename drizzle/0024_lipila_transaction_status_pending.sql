-- Support pending Lipila transactions (collections initiation).

DO $$
BEGIN
  ALTER TYPE "lipila_transaction_status" ADD VALUE IF NOT EXISTS 'pending';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

