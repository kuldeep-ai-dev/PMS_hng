-- COMPLETE SANDBOX AUDIT & EXPANSION
-- This migration ensures 100% database coverage for Sandbox isolation.

DO $$
DECLARE
    t TEXT;
    -- Full list of tables that handle transactional or session-specific data
    tables TEXT[] := ARRAY[
        -- Core Hotel Operations
        'bookings', 'guests', 'payments', 'extra_charges', 'night_audit_logs', 
        'room_blocks', 'room_transfers', 'cleaning_assignments', 'website_bookings',
        
        -- Restaurant & Loyalty
        'restaurant_orders', 'restaurant_order_items', 'restaurant_reservations',
        'restaurant_loyalty_transactions', 'restaurant_loyalty_wallets', 'restaurant_customers',
        
        -- Inventory System
        'inventory_items', 'inventory_purchase_orders', 'inventory_po_items', 
        'inventory_wastage', 'inventory_audits',
        
        -- Logs & Analytics
        'whatsapp_analytics', 'staff_attendance', 'staff_activity_logs', 
        'system_activity_logs', 'debug_log',
        
        -- CRM & Business
        'leads', 'companies', 'license_renewal_requests'
    ];
BEGIN
    FOR t IN SELECT unnest(tables) LOOP
        -- 1. Add Column (Safe if already exists from previous migration)
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN DEFAULT false', t);

        -- 2. Ensure RLS is enabled
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);

        -- 3. Apply Isolation Policy
        EXECUTE format('
            DROP POLICY IF EXISTS "Sandbox Isolation Policy" ON %I;
            CREATE POLICY "Sandbox Isolation Policy" ON %I AS PERMISSIVE FOR ALL TO authenticated
            USING (is_test_data = public.is_sandbox_active())
            WITH CHECK (is_test_data = public.is_sandbox_active());
        ', t, t);

        -- 4. Apply Service Role Bypass (For cleanup/admin tasks)
        EXECUTE format('
            DROP POLICY IF EXISTS "Service Role Bypass" ON %I;
            CREATE POLICY "Service Role Bypass" ON %I AS PERMISSIVE FOR ALL TO service_role
            USING (true) WITH CHECK (true);
        ', t, t);

        -- 5. Apply Automatic Tagging Trigger
        EXECUTE format('
            DROP TRIGGER IF EXISTS tr_set_sandbox_flag ON %I;
            CREATE TRIGGER tr_set_sandbox_flag BEFORE INSERT ON %I FOR EACH ROW
            EXECUTE FUNCTION public.set_sandbox_flag();
        ', t, t);

        -- 6. Add Index for performance
        EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I(is_test_data)', 'idx_' || t || '_sandbox', t);
    END LOOP;
END $$;
