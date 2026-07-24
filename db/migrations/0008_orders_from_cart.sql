-- Migration 0008: order_items
-- The orders table and all its columns already exist from earlier migrations.
-- This migration only adds the order_items table (genuinely new).

CREATE TABLE IF NOT EXISTS order_items (
  id            TEXT    PRIMARY KEY,
  order_id      TEXT    NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id    TEXT    NOT NULL,
  variant_id    TEXT,
  product_title TEXT    NOT NULL,
  variant_title TEXT,
  sku           TEXT,
  quantity      INTEGER NOT NULL DEFAULT 1,
  price_minor   INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_number     ON orders(order_number);
