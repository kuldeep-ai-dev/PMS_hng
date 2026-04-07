-- 1. Create the base logging table
CREATE TABLE IF NOT EXISTS public.system_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE', 'AUTH', 'SYSTEM'
    module TEXT,               -- 'inventory', 'license', 'bookings', etc.
    description TEXT,
    table_name TEXT,
    record_id UUID,
    payload_before JSONB DEFAULT '{}'::jsonb,
    payload_after JSONB DEFAULT '{}'::jsonb,
    admin_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create the Generic Audit Trigger Function
CREATE OR REPLACE FUNCTION public.fn_audit_log_mutation()
RETURNS TRIGGER AS $$
DECLARE
    v_admin_id UUID;
BEGIN
    -- Attempt to get the current user ID if available in session
    BEGIN
        v_admin_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_admin_id := NULL;
    END;

    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.system_activity_logs (event_type, module, table_name, record_id, payload_after, admin_id, description)
        VALUES ('INSERT', 'database', TG_TABLE_NAME, NEW.id, to_jsonb(NEW), v_admin_id, 'New record created in ' || TG_TABLE_NAME);
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.system_activity_logs (event_type, module, table_name, record_id, payload_before, payload_after, admin_id, description)
        VALUES ('UPDATE', 'database', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW), v_admin_id, 'Record updated in ' || TG_TABLE_NAME);
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO public.system_activity_logs (event_type, module, table_name, record_id, payload_before, admin_id, description)
        VALUES ('DELETE', 'database', TG_TABLE_NAME, OLD.id, to_jsonb(OLD), v_admin_id, 'Record deleted from ' || TG_TABLE_NAME);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Apply Triggers to ALL Tables in Public Schema (Dynamic)
DO $$
DECLARE
    t RECORD;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name != 'system_activity_logs' -- Avoid infinite recursion
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON public.%I', t.table_name, t.table_name);
        EXECUTE format('CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION fn_audit_log_mutation()', t.table_name, t.table_name);
    END LOOP;
END $$;

-- 4. Indices and Search Optimization
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON public.system_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_table_name ON public.system_activity_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_system_logs_event_type ON public.system_activity_logs(event_type);

-- 5. RLS
ALTER TABLE public.system_activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Master users can view system logs" ON public.system_activity_logs FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'master'));
CREATE POLICY "Enable insert for authenticated users" ON public.system_activity_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
