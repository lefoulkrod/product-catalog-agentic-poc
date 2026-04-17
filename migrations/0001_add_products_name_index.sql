-- Migration: 0001_add_products_name_index.sql
-- Fixes full-table scan on GET /api/products ORDER BY name DESC
-- Trace evidence: F524D0C183499665646240243BE9CBB9 (avg query time 3,538 ms)
--
-- The GET /api/products endpoint in src/server.js issues:
--   SELECT id, sku, name, category, brand, price, stock_qty, rating
--   FROM products ORDER BY name DESC LIMIT ?
-- Without an index on `name`, MySQL performs a full-table scan + filesort on
-- every request, causing avg latency of 1,298 ms against a 500 ms SLA target.
-- This index allows the query planner to satisfy ORDER BY name using an index
-- range scan, eliminating the filesort entirely.

CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
