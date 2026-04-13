ALTER TABLE "inventory_batches" RENAME COLUMN "unit_cost_cents" TO "unit_order_price_cents";
ALTER TABLE "inventory_transactions" RENAME COLUMN "unit_cost_cents" TO "unit_order_price_cents";

