-- Add early check-in rules to hotel settings
ALTER TABLE public.hotel_settings 
ADD COLUMN IF NOT EXISTS early_checkin_rules JSONB DEFAULT '[
    {"time_limit": "06:00", "charge_percentage": 100, "label": "Full Day Charge"},
    {"time_limit": "10:00", "charge_percentage": 50, "label": "Half Day Charge"},
    {"time_limit": "12:00", "charge_percentage": 0, "label": "Complimentary"}
]'::jsonb;

-- Comment for clarity
COMMENT ON COLUMN public.hotel_settings.early_checkin_rules IS 'Stores rules for early check-in charges. Format: List of objects with time_limit (HH:mm) and charge_percentage.';
