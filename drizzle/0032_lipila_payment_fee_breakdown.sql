CREATE TYPE "public"."lipila_fee_payer" AS ENUM('merchant', 'customer', 'wallet');

ALTER TABLE "lipila_payment_transactions"
ADD COLUMN "gross_amount_cents" integer,
ADD COLUMN "fee_cents" integer DEFAULT 0 NOT NULL,
ADD COLUMN "net_amount_cents" integer,
ADD COLUMN "fee_bps" integer DEFAULT 0 NOT NULL,
ADD COLUMN "fee_payer" "lipila_fee_payer";

UPDATE "lipila_payment_transactions"
SET
  "gross_amount_cents" = "amount_cents",
  "net_amount_cents" = "amount_cents",
  "fee_payer" = CASE
    WHEN "operation" = 'wallet_disbursement' THEN 'wallet'::"lipila_fee_payer"
    ELSE 'merchant'::"lipila_fee_payer"
  END
WHERE "gross_amount_cents" IS NULL
   OR "net_amount_cents" IS NULL
   OR "fee_payer" IS NULL;

ALTER TABLE "lipila_payment_transactions"
ALTER COLUMN "gross_amount_cents" SET NOT NULL,
ALTER COLUMN "net_amount_cents" SET NOT NULL,
ALTER COLUMN "fee_payer" SET DEFAULT 'merchant',
ALTER COLUMN "fee_payer" SET NOT NULL;
