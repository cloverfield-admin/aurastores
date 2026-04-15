-- Lipila Collections referenceId is not guaranteed to be a UUID.
-- Store it separately as text for idempotency + status polling.

ALTER TABLE "lipila_transactions"
ADD COLUMN IF NOT EXISTS "reference_id_text" varchar(128);

CREATE UNIQUE INDEX IF NOT EXISTS "lipila_transactions_reference_text_unique"
ON "lipila_transactions" ("reference_id_text");

