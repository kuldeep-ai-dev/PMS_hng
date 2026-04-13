-- SANDBOX MODE SECURITY & ISOLATION
-- This migration implements database-level isolation using RLS.

-- 1. Helper function to get current sandbox state
CREATE OR REPLACE FUNCTION public.is_sandbox_active()
RETURNS BOOLEAN AS $$
  SELECT is_sandbox_mode FROM public.hotel_settings LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. Update RLS for transactional tables to enforce the current mode.
-- For every table, we want to ensure:
--   a) Users ONLY see data matching the current mode (Real or Sandbox).
--   b) Users ONLY insert data matching the current mode.

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
        -- Remove existing broad policies if they exist (need to be careful here, usually we add on top)
        -- Instead of dropping, we will ALTER the tables to ensure RLS is enabled
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        
        -- Add the Sandbox Isolation Policy
        -- This policy ensures that ALL operations (SELECT, INSERT, UPDATE, DELETE)
        -- are restricted to rows that match the current system mode.
        
        EXECUTE format('
            DROP POLICY IF EXISTS "Sandbox Isolation Policy" ON %I;
            CREATE POLICY "Sandbox Isolation Policy" ON %I
            AS PERMISSIVE
            FOR ALL
            TO authenticated
            USING (is_test_data = public.is_sandbox_active())
            WITH CHECK (is_test_data = public.is_sandbox_active());
        ', t, t);
        
        -- Add a special policy for service_role to bypass isolation if needed (e.g. for the purge action)
        EXECUTE format('
            DROP POLICY IF EXISTS "Service Role Bypass" ON %I;
            CREATE POLICY "Service Role Bypass" ON %I
            AS PERMISSIVE
            FOR ALL
            TO service_role
            USING (true)
            WITH CHECK (true);
        ', t, t);
    END LOOP;
END $$;
