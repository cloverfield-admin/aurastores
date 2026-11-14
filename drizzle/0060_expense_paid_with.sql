-- Record how each expense was paid, so the profit & loss can show cash.
--
-- Net profit is sales minus the cost of what sold minus expenses, but owners
-- reconcile against what is in the drawer and on the phone: money in minus
-- money out, stock purchases included. Answering "where is my cash" needs to
-- know which of those pots each payment left from — sales already record it
-- (payments.method), expenses did not.
--
-- Reuses the sales `payment_method` enum so a channel means the same thing on
-- both sides of the ledger.
--
-- Nullable: manual expenses entered before this column existed have no answer,
-- and guessing one would put money in the wrong pot. The statement reports them
-- as "not specified" instead.
ALTER TABLE "expenses"
  ADD COLUMN IF NOT EXISTS "paid_with" "payment_method";
--> statement-breakpoint
-- System-generated charges have a known source: Lipila takes the collection
-- fee out of the mobile-money settlement, and the withdrawal fee out of the
-- Aura Pay wallet. The engine sets these on insert from now on; this fills in
-- the rows written before.
UPDATE "expenses"
SET "paid_with" = CASE "charge_type"
      WHEN 'momo_sale_fee' THEN 'mobile_money'::"payment_method"
      WHEN 'wallet_withdrawal_fee' THEN 'aura_pay_wallet'::"payment_method"
    END,
    "updated_at" = now()
WHERE "expense_type" = 'charge'
  AND "paid_with" IS NULL
  AND "charge_type" IN ('momo_sale_fee', 'wallet_withdrawal_fee');
