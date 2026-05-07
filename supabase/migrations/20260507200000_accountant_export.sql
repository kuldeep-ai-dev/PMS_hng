-- Add accountant details to hotel_settings
ALTER TABLE public.hotel_settings 
ADD COLUMN IF NOT EXISTS accountant_name TEXT DEFAULT '';

ALTER TABLE public.hotel_settings 
ADD COLUMN IF NOT EXISTS accountant_email TEXT DEFAULT '';

-- Create shared_exports table for temporary links
CREATE TABLE IF NOT EXISTS public.shared_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days'
);

-- Enable RLS and add basic policies (public can read if they have the ID, only authenticated can create)
ALTER TABLE public.shared_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read shared_exports by ID" ON public.shared_exports
    FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can create shared_exports" ON public.shared_exports
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');
