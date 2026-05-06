-- Multi-currency migration
-- Run this once in the Supabase SQL editor (or any psql client connected to your project).

-- 1. Products: store the native currency of each product price
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS base_currency TEXT NOT NULL DEFAULT 'MAD';

-- 2. Invoice items: snapshot the conversion metadata at item-creation time
--    All three columns are nullable so existing rows are untouched.
ALTER TABLE invoice_items
  ADD COLUMN IF NOT EXISTS original_price    NUMERIC,
  ADD COLUMN IF NOT EXISTS base_currency     TEXT,
  ADD COLUMN IF NOT EXISTS rate_snapshot     NUMERIC;
