-- Record how a subscription invoice was actually paid.
--
-- Payment history could only show the date, plan and amount: the invoice keeps
-- an `identifier` (our own reference) and nothing about the instrument, so the
-- "method" column had no data behind it and the design's network + masked
-- number were unrenderable.
--
-- The checkout already knows both — it normalizes the MSISDN and resolves the
-- operator before it starts the collection — so this captures them at that
-- point rather than trying to parse them back out of a webhook payload whose
-- shape the provider controls.
--
-- Nullable: invoices raised before this column existed have no answer, and
-- guessing one would be worse than showing nothing.
ALTER TABLE "subscription_invoices"
  ADD COLUMN IF NOT EXISTS "payment_method" varchar(16),
  ADD COLUMN IF NOT EXISTS "payment_operator" varchar(16),
  ADD COLUMN IF NOT EXISTS "payment_account_masked" varchar(32);
