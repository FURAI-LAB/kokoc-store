-- Migration 0007: product reviews + cached rating aggregates
--
-- Adds real customer reviews so Product JSON-LD can honestly emit
-- `aggregateRating` / `review` (previously absent — flagged by Google
-- Search Console as a missing-field warning on /product/* pages).
--
-- rating_count / rating_avg are denormalized onto `products` so the
-- product detail query (lib/catalog.js) doesn't need a second
-- aggregate query on every page load — they're updated whenever a
-- review is inserted/approved/deleted (see lib/reviews.js).

CREATE TABLE IF NOT EXISTS product_reviews (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product_status
  ON product_reviews(product_id, status);

-- Cached aggregates — only ever computed from status = 'approved' rows.
ALTER TABLE products ADD COLUMN rating_avg REAL;
ALTER TABLE products ADD COLUMN rating_count INTEGER NOT NULL DEFAULT 0;
