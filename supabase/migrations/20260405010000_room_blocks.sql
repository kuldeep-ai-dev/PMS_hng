CREATE TABLE IF NOT EXISTS room_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    manager_id UUID REFERENCES profiles(id),
    block_reason TEXT NOT NULL,
    unblocked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    unblocked_by UUID REFERENCES profiles(id)
);

ALTER TABLE rooms ADD COLUMN IF NOT EXISTS blocked_reason TEXT;
