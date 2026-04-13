ALTER TABLE public.staff_attendance
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS selfie_url TEXT;

-- Note: Ensure the "staff-selfies" storage bucket is created manually or via another script.
