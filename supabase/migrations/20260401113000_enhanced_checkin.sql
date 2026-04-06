-- 1. Extend the GUESTS table with new profile fields & foreign tracking
ALTER TABLE guests 
ADD COLUMN IF NOT EXISTS guest_type text DEFAULT 'Standard',
ADD COLUMN IF NOT EXISTS pin_code text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS country text DEFAULT 'India',
ADD COLUMN IF NOT EXISTS is_foreign boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS passport_number text,
ADD COLUMN IF NOT EXISTS guide_name text,
ADD COLUMN IF NOT EXISTS guide_phone text;

-- 2. Extend the BOOKINGS table with new room options and PAX logic
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS extra_beds integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS food_plan text DEFAULT 'EP',
ADD COLUMN IF NOT EXISTS pax_count integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS accompanying_guests jsonb DEFAULT '[]'::jsonb;
