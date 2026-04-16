-- Migration: add FULLTEXT index on products(name, description)
-- Fixes: dual leading-wildcard LIKE full-table scans on GET /api/products/search
-- Evidence: trace 4688296BFEA50CFA6F1B11AE5608038F
--   scan 1: SELECT count(*) FROM products WHERE (name LIKE ? OR description LIKE ?) AND price <= ?  → 2,382 ms
--   scan 2: SELECT ... FROM products WHERE (name LIKE ? OR description LIKE ?) ORDER BY price ASC LIMIT ? → 2,073 ms
--   combined: 4,454 ms / 4,456 ms trace (99.9% DB-bound)
--   avg latency across 447 requests: ~1,675 ms
--
-- After adding this index, update the search queries in application code to use:
--   MATCH(name, description) AGAINST (? IN BOOLEAN MODE)
-- instead of: name LIKE ? OR description LIKE ?
--
-- NOTE: FULLTEXT index build acquires a metadata lock; run during low-traffic window
-- or use pt-online-schema-change / gh-ost for zero-downtime migration on large tables.

ALTER TABLE products
    ADD FULLTEXT INDEX ft_products_name_description (name, description);
