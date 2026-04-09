CREATE TABLE IF NOT EXISTS public.staff_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT CHECK (status IN ('present', 'absent', 'late', 'half_day')),
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated users, or however it's configured
CREATE POLICY "Enable read access for all users" ON public.staff_attendance FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.staff_attendance FOR INSERT WITH CHECK (auth.uid() = staff_id OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'master'));
CREATE POLICY "Enable update for admins and owners" ON public.staff_attendance FOR UPDATE USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'master'));

