-- SANDBOX STATE BACKUP SUPPORT
-- This migration adds support for snapshotting hotel assets before Sandbox Mode starts.

-- 1. Add snapshot column to hotel_settings
ALTER TABLE hotel_settings ADD COLUMN IF NOT EXISTS sandbox_snapshot JSONB;

COMMENT ON COLUMN hotel_settings.sandbox_snapshot IS 'Stores a JSON mapping of room statuses and inventory levels before entering sandbox mode to allow for absolute restoration.';
