-- Migration: add_categories_brands_indexes.sql
-- Purpose : Speed up SELECT DISTINCT ... ORDER BY queries issued by
--           /api/categories and /api/brands endpoints in src/server.js.
--
-- Both endpoints execute full-table scans on the `products` table because
-- the `category` and `brand` columns have no index. Adding B-tree indexes
-- lets MySQL satisfy DISTINCT + ORDER BY using an index scan instead of a
-- filesort, eliminating the performance bottleneck observed in APM traces:
--   /api/categories  avg 633 ms  (202 requests) — target ≤ 500 ms
--   /api/brands      avg 591 ms  (186 requests) — target ≤ 500 ms
--
-- These are additive-only changes. No columns or tables are dropped or altered.

-- Index for: SELECT DISTINCT category FROM products ORDER BY category
CREATE INDEX idx_products_category ON products (category);

-- Index for: SELECT DISTINCT brand FROM products ORDER BY brand
CREATE INDEX idx_products_brand ON products (brand);
