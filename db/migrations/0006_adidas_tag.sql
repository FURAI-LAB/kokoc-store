-- Migration 0006: tag all Adidas Originals products with 'adidas'
--
-- Adds 'adidas' to the comma-separated `tags` column for every product
-- whose brand = 'Adidas Originals', so they're catchable by the new
-- "Adidas" filter chip on /catalog (in addition to the existing
-- brand-scoped /adidas page). Idempotent — safe to run multiple times.

UPDATE products
SET tags = CASE
  WHEN tags IS NULL OR TRIM(tags) = ''
    THEN 'adidas'
  WHEN (',' || tags || ',') LIKE '%,adidas,%'
    THEN tags  -- already tagged, leave untouched
  ELSE tags || ',adidas'
END
WHERE brand = 'Adidas Originals';
