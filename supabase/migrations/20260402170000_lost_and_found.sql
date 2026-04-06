-- Migration: Add Lost and Found Table
-- Description: Creates a table to track lost and found items in the hotel.

CREATE TABLE lost_and_found (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_name TEXT NOT NULL,
    description TEXT,
    location_found TEXT,
    found_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'Found' CHECK (status IN ('Found', 'Claimed', 'Disposed')),
    finder_name TEXT,
    claimant_name TEXT,
    claimant_phone TEXT,
    claimed_date TIMESTAMP WITH TIME ZONE,
    room_id UUID REFERENCES rooms(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE lost_and_found ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for authenticated users" ON lost_and_found
    FOR ALL USING (auth.role() = 'authenticated');
