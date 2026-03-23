CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Speeds up ILIKE lookups used by stock search.
CREATE INDEX IF NOT EXISTS products_name_trgm_idx
  ON products
  USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS products_sku_trgm_idx
  ON products
  USING gin (sku gin_trgm_ops);

CREATE INDEX IF NOT EXISTS inventory_batches_batch_number_trgm_idx
  ON inventory_batches
  USING gin (batch_number gin_trgm_ops);

CREATE INDEX IF NOT EXISTS suppliers_name_trgm_idx
  ON suppliers
  USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS product_categories_name_trgm_idx
  ON product_categories
  USING gin (name gin_trgm_ops);
