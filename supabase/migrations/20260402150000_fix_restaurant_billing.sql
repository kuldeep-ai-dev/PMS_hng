-- Fix Restaurant billing leakage by linking orders to specific bookings
ALTER TABLE restaurant_orders ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_restaurant_orders_booking_id ON restaurant_orders(booking_id);
