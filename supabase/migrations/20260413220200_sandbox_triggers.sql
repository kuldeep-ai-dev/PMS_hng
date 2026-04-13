-- AUTOMATIC SANDBOX TAGGING
-- This ensures that whenever a row is inserted, it is automatically
-- tagged with the current system mode, preventing data mixing.

-- 1. Function to set is_test_data automatically
CREATE OR REPLACE FUNCTION public.set_sandbox_flag()
RETURNS TRIGGER AS $$
BEGIN
  -- Automatically set the flag based on current system mode
  NEW.is_test_data := public.is_sandbox_active();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Apply this trigger to all relevant tables
DO $$
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY[
        'bookings', 'guests', 'payments', 'extra_charges', 
        'night_audit_logs', 'room_blocks', 'staff_attendance', 'companies',
        'restaurant_orders', 'restaurant_order_items', 'restaurant_reservations',
        'lost_and_found', 'marketing_campaigns', 'system_activity_logs'
    ];
BEGIN
    FOR t IN SELECT unnest(tables) LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS tr_set_sandbox_flag ON %I;
            CREATE TRIGGER tr_set_sandbox_flag
            BEFORE INSERT ON %I
            FOR EACH ROW
            EXECUTE FUNCTION public.set_sandbox_flag();
        ', t, t);
    END LOOP;
END $$;
