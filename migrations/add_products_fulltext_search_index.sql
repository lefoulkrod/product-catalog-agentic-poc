-- Migration: add full-text search index on products(name, description)
-- Trace evidence: 4688296BFEA50CFA6F1B11AE5608038F
--   Query 1 (count): 2,382 ms — SELECT count(*) ... WHERE name LIKE ? OR description LIKE ?
--   Query 2 (data):  2,073 ms — SELECT ... WHERE name LIKE ? OR description LIKE ? ORDER BY ...
-- Leading-wildcard LIKE patterns defeat B-tree indexes; a FULLTEXT index enables efficient search.

-- === MySQL / MariaDB ===
-- Uncomment the block matching your database engine.

-- ALTER TABLE products ADD FULLTEXT INDEX idx_products_name_description_ft (name, description);
-- After applying: rewrite queries to use MATCH(name, description) AGAINST (? IN BOOLEAN MODE)
-- instead of: name LIKE ? OR description LIKE ?

-- === PostgreSQL ===
-- Requires pg_trgm extension (available in RDS, Aurora, Supabase, etc.):
--
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE INDEX IF NOT EXISTS idx_products_name_trgm        ON products USING GIN (name        gin_trgm_ops);
-- CREATE INDEX IF NOT EXISTS idx_products_description_trgm ON products USING GIN (description gin_trgm_ops);
-- After applying: ILIKE '%term%' queries are automatically accelerated by the GIN indexes.
-- No query rewrite required for PostgreSQL + pg_trgm.
