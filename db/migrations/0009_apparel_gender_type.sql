-- Migration 0009: apparel gender + type for size-guide selection
--
-- Adds two product-level fields used to pick the correct official Adidas
-- Asia size chart for apparel products (t-shirts/jackets vs shorts/pants,
-- men's vs women's). Both are nullable — irrelevant for footwear.

ALTER TABLE products ADD COLUMN gender TEXT DEFAULT NULL;
-- gender: 'men' | 'women' | NULL (unset/not applicable, e.g. footwear)

ALTER TABLE products ADD COLUMN apparel_type TEXT DEFAULT NULL;
-- apparel_type: 'top' (футболки/куртки/худи) | 'bottom' (шорты/брюки) | NULL
