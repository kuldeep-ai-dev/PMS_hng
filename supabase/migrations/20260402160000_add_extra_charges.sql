-- Create extra_charges table for miscellaneous billing (Laundry, etc.)
CREATE TABLE IF NOT EXISTS extra_charges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE extra_charges ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to manage extra charges
CREATE POLICY "Allow authenticated full access to extra_charges" ON extra_charges
FOR ALL TO authenticated USING (true) WITH CHECK (true);
