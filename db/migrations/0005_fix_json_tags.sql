-- Migration 0005: fix tags stored as JSON arrays → comma-separated strings
--
-- Previous admin.js used JSON.stringify(tags), storing e.g. '["crocs","jibbitz"]'
-- The catalog SQL filter expects comma-separated: 'crocs,jibbitz'
-- This migration converts all JSON-format tags to the correct format.
--
-- Safe to run multiple times (CASE checks for '[' prefix before converting).

UPDATE products
SET tags = (
  -- Strip [ ] brackets and quotes, collapse to comma-separated
  REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(
          TRIM(tags, '[]'),   -- remove surrounding [ ]
          '"', ''             -- remove all "
        ),
        ', ', ','             -- normalise ", " → ","
      ),
      ' ,', ','              -- normalise " ," → ","
    ),
    '  ', ' '               -- collapse double spaces (safety)
  )
)
WHERE tags IS NOT NULL
  AND TRIM(tags) LIKE '[%]';  -- only rows that are JSON arrays
