-- Org-scoped trigram indexes for sale-time product search.
--
-- The single-column trigram indexes from 0004 (products_name_trgm_idx,
-- products_sku_trgm_idx) match candidate rows across ALL organizations before
-- the organization_id filter is applied — on a multi-tenant products table a
-- common term produces many cross-tenant candidates. btree_gin lets a single
-- GIN index combine the organization_id equality with the trigram match, so the
-- scan is restricted to the tenant first, then trigram-matched on name/sku.
CREATE EXTENSION IF NOT EXISTS btree_gin;

CREATE INDEX IF NOT EXISTS products_org_name_trgm_idx
  ON products
  USING gin (organization_id, name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS products_org_sku_trgm_idx
  ON products
  USING gin (organization_id, sku gin_trgm_ops);
