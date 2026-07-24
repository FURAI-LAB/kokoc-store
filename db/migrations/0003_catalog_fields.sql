-- Migration 0003: catalog fields
-- Adds badge label and tags to products, and crocs_size to variants

ALTER TABLE products ADD COLUMN badge TEXT DEFAULT NULL;
-- badge values: 'new' | 'hit' | 'limited' | null

ALTER TABLE products ADD COLUMN tags TEXT DEFAULT NULL;
-- tags: comma-separated string, e.g. "crocs,pastel,platform"
-- used for front-end filter chips

ALTER TABLE product_variants ADD COLUMN crocs_size TEXT DEFAULT NULL;
-- crocs_size: Crocs US size label, e.g. "M6 W8"
-- used to display size guide table on product quick-view
