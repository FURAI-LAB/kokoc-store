-- Migration 0002: subscribers
-- Newsletter/subscription capture table.

CREATE TABLE IF NOT EXISTS subscribers (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  source      TEXT NOT NULL DEFAULT 'newsletter',
  ip_hash     TEXT,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscribers_email
  ON subscribers (email);

CREATE INDEX IF NOT EXISTS idx_subscribers_created
  ON subscribers (created_at DESC);
