-- 0009_listing_card_fields.sql
-- Add is_featured flag to models (default false) and listed_at timestamp to used_cars (default now())

ALTER TABLE models ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE used_cars ADD COLUMN IF NOT EXISTS listed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

