-- Migration 001: Add index on products(created_at)
--
-- Problem:  GET /api/products with ORDER BY created_at performs a full-table
--           sort on every paginated listing request because no index exists on
--           the created_at column.
--
-- Evidence: Trace 1B0AB59A627B379609D5FAE11435D2FF captured the query:
--             SELECT id, sku, name, category, brand, price, stock_qty, rating
--             FROM products ORDER BY created_at ASC LIMIT ?
--           taking up to 4,973 ms (95% of total trace duration).
--           Endpoint avg latency: 1,287 ms vs. 500 ms target.
--
-- Fix:      A B-tree index on created_at allows MySQL to satisfy the ORDER BY
--           from the index, eliminating the full-table sort entirely.
--
-- Safety:   Additive-only — no existing indexes, columns, or data are modified.
--           IF NOT EXISTS prevents failure on re-runs.

CREATE INDEX IF NOT EXISTS idx_products_created_at
    ON products (created_at);
