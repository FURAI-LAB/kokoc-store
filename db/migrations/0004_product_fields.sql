-- Migration 0004: add product-level price, inventory, category, sku, visibility, sizes, colors
ALTER TABLE products ADD COLUMN category TEXT DEFAULT NULL;
ALTER TABLE products ADD COLUMN sku TEXT DEFAULT NULL;
ALTER TABLE products ADD COLUMN price_minor INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN compare_at_minor INTEGER DEFAULT NULL;
ALTER TABLE products ADD COLUMN inventory_quantity INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN visibility TEXT NOT NULL DEFAULT 'visible';
ALTER TABLE products ADD COLUMN sizes TEXT DEFAULT NULL;
ALTER TABLE products ADD COLUMN colors TEXT DEFAULT NULL;
