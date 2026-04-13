-- TOTAL SCHEMA LOCKDOWN (100% COVERAGE)
-- This migration force-applies the sandbox isolation logic to EVERY table in the public schema.

DO $$
DECLARE
    t TEXT;
BEGIN
    -- Iterate through EVERY base table in the public schema
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        -- Exclude the root settings table which holds the Sandbox Toggle itself
        AND table_name != 'hotel_settings'
    LOOP
        -- 1. Ensure the is_test_data column exists
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS is_test_data BOOLEAN DEFAULT false', t);

        -- 2. Force Enable RLS
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);

        -- 3. System-Wide Isolation Policy
        EXECUTE format('
            DROP POLICY IF EXISTS "Sandbox Isolation Policy" ON %I;
            CREATE POLICY "Sandbox Isolation Policy" ON %I AS PERMISSIVE FOR ALL TO authenticated
            USING (is_test_data = public.is_sandbox_active())
            WITH CHECK (is_test_data = public.is_sandbox_active());
        ', t, t);

        -- 4. Admin/Service Bypass Policy
        EXECUTE format('
            DROP POLICY IF EXISTS "Service Role Bypass" ON %I;
            CREATE POLICY "Service Role Bypass" ON %I AS PERMISSIVE FOR ALL TO service_role
            USING (true) WITH CHECK (true);
        ', t, t);

        -- 5. Automatic Tagging Trigger
        EXECUTE format('
            DROP TRIGGER IF EXISTS tr_set_sandbox_flag ON %I;
            CREATE TRIGGER tr_set_sandbox_flag BEFORE INSERT ON %I FOR EACH ROW
            EXECUTE FUNCTION public.set_sandbox_flag();
        ', t, t);

        -- 6. Sandbox Performance Index
        EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I(is_test_data)', 'idx_' || t || '_sandbox_global', t);
        
        RAISE NOTICE 'Total Lockdown applied to table: %', t;
    END LOOP;
END $$;
