-- Migration 0010: mini-game sessions + promo codes
--
-- Backs the "Собери Jibbitz" match-3 mini-game at /minigame.
--
-- minigame_sessions: one row per game started. Stores the server-issued
-- seed so /api/minigame/finish can regenerate the exact same board and
-- replay the client's submitted moves itself — the client never gets to
-- assert its own score. `status` moves open -> finished; a session can only
-- be finished once (prevents replaying the same seed for repeat payouts).
--
-- promo_codes: generic table, but for now only ever populated by the
-- mini-game with a fixed 500 RUB discount on Crocs. One row per
-- device (device_sid), enforced by the unique index below — a given
-- browser/device can only ever be issued one mini-game promo code, no
-- matter how many times it replays the game.

CREATE TABLE IF NOT EXISTS minigame_sessions (
  id TEXT PRIMARY KEY,
  device_sid TEXT NOT NULL,
  seed INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', -- 'open' | 'finished'
  score INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_minigame_sessions_device ON minigame_sessions(device_sid);

CREATE TABLE IF NOT EXISTS promo_codes (
  code TEXT PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'minigame', -- where it was earned, for future reuse beyond the mini-game
  device_sid TEXT NOT NULL,
  discount_type TEXT NOT NULL DEFAULT 'fixed', -- 'fixed' | 'percent' (only 'fixed' used today)
  discount_value_minor INTEGER NOT NULL, -- e.g. 50000 = 500.00 RUB
  applies_to TEXT NOT NULL DEFAULT 'crocs', -- brand/scope this code is valid for
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'used' | 'expired'
  used_at TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- One mini-game promo per device, ever — regardless of how many sessions
-- they play or finish. Enforced at the DB level, not just in app logic.
CREATE UNIQUE INDEX IF NOT EXISTS idx_promo_codes_device_source ON promo_codes(device_sid, source);
