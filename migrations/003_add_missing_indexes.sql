-- Migration: 003_add_missing_indexes.sql
-- Addresses full-table scans observed in SolarWinds APM traces:
--   Finding 1: /api/products/search  — LIKE on name/description, avg 1674 ms (trace 8A8887456CAAE981BD41ECB62DC0CDF8)
--   Finding 2: /api/products          — ORDER BY name DESC, avg 1302 ms (trace FB1B0C8AA456DADFE8CD2BAC5BC6066D)
--   Finding 3: /api/brands            — DISTINCT brand ORDER BY brand, avg 604 ms (trace 25138F357B6F0CA868CEBC6D3F862658)
--   Finding 4: /api/categories        — DISTINCT category ORDER BY category, avg 620 ms (trace 9F938B22E8CAB75A84B9D3E74B1ED84E)

-- Supports ORDER BY name ASC/DESC on /api/products and prefix LIKE 'term%' on /api/products/search.
-- Note: leading-wildcard LIKE '%term%' cannot use a B-tree index; consider adding a
-- full-text index (see comment below) for full substring search performance.
CREATE INDEX IF NOT EXISTS idx_products_name
    ON products (name);

-- Supports SELECT DISTINCT brand ORDER BY brand on /api/brands.
CREATE INDEX IF NOT EXISTS idx_products_brand
    ON products (brand);

-- Supports SELECT DISTINCT category ORDER BY category on /api/categories.
CREATE INDEX IF NOT EXISTS idx_products_category
    ON products (category);

-- Optional: composite covering index for the paginated product listing query.
-- Covers: ORDER BY name DESC LIMIT ? and the count(*) scan.
-- Uncomment if the products table is large and the DBA approves.
-- CREATE INDEX IF NOT EXISTS idx_products_name_price
--     ON products (name, price);

-- Optional: full-text index for /api/products/search substring matching.
-- Requires MySQL 5.6+ InnoDB or PostgreSQL tsvector approach.
-- For MySQL:
-- ALTER TABLE products ADD FULLTEXT INDEX ft_products_name_desc (name, description);
-- Then rewrite the LIKE query to: MATCH(name, description) AGAINST (? IN BOOLEAN MODE)
