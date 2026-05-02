-- Multi-vertical: classify organizations (existing rows remain pharmacy).
CREATE TYPE "store_vertical" AS ENUM ('pharmacy', 'general_retail');

ALTER TABLE "organizations"
  ADD COLUMN "store_vertical" "store_vertical" NOT NULL DEFAULT 'pharmacy';
