-- Add Sandbox Mode support to the system
-- Step 1: Update hotel_settings to store global state
ALTER TABLE hotel_settings ADD COLUMN IF NOT EXISTS is_sandbox_mode BOOLEAN DEFAULT false;

-- Step 2: Add is_test_data flag to all business data tables
-- This allows us to separate real business data from test data

-- Hotel Core
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN DEFAULT false;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN DEFAULT false;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN DEFAULT false;
ALTER TABLE extra_charges ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN DEFAULT false;
ALTER TABLE night_audit_logs ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN DEFAULT false;
ALTER TABLE room_blocks ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN DEFAULT false;
ALTER TABLE staff_attendance ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN DEFAULT false;

-- Restaurant
ALTER TABLE restaurant_orders ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN DEFAULT false;
ALTER TABLE restaurant_order_items ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN DEFAULT false;
ALTER TABLE restaurant_reservations ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN DEFAULT false;

-- Management & Marketing
ALTER TABLE lost_and_found ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN DEFAULT false;
ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN DEFAULT false;
ALTER TABLE system_activity_logs ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN DEFAULT false;

-- Step 3: Create indexes for performance filtering
CREATE INDEX IF NOT EXISTS idx_bookings_sandbox ON bookings(is_test_data);
CREATE INDEX IF NOT EXISTS idx_restaurant_orders_sandbox ON restaurant_orders(is_test_data);
CREATE INDEX IF NOT EXISTS idx_payments_sandbox ON payments(is_test_data);

-- Step 4: Add a security comment to remind future developers
COMMENT ON COLUMN hotel_settings.is_sandbox_mode IS 'Master toggle for Sandbox Mode. When ON, all new data is flagged as test data and isolated.';
