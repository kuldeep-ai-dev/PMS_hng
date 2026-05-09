-- Create RPC to fetch active booking guest name for QR menu personalization
CREATE OR REPLACE FUNCTION get_active_booking_details(p_room_id UUID)
RETURNS TABLE (booking_id UUID, guest_name TEXT) 
LANGUAGE plpgsql
SECURITY DEFINER -- Essential to bypass RLS for public QR menu access
AS $$
BEGIN
    RETURN QUERY
    SELECT b.id, g.name
    FROM bookings b
    JOIN guests g ON b.guest_id = g.id
    WHERE b.room_id = p_room_id 
    AND b.status IN ('Checked_In', 'Active')
    ORDER BY b.created_at DESC
    LIMIT 1;
END;
$$;
