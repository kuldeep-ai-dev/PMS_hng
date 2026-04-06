CREATE TABLE IF NOT EXISTS night_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_date DATE NOT NULL UNIQUE,
    manager_id UUID REFERENCES profiles(id),
    total_room_revenue NUMERIC DEFAULT 0,
    total_occupancy INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION execute_night_audit(p_audit_date DATE, p_tax_rate NUMERIC, p_manager_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_booking RECORD;
    v_charge_amount NUMERIC;
    v_total_revenue NUMERIC := 0;
    v_occupancy INT := 0;
    v_result JSONB;
BEGIN
    -- Check if audit for this date is already run
    IF EXISTS (SELECT 1 FROM night_audit_logs WHERE audit_date = p_audit_date) THEN
        RAISE EXCEPTION 'Night audit for % has already been executed.', p_audit_date;
    END IF;

    -- Loop through active in-house bookings
    -- status = 'Active', check_in_date <= p_audit_date, check_out_date > p_audit_date
    FOR v_booking IN 
        SELECT b.id AS booking_id, b.room_id, r.base_rate, b.guest_id
        FROM bookings b
        JOIN rooms r ON b.room_id = r.id
        WHERE b.status = 'Active'
            AND b.check_in_date::date <= p_audit_date
            AND b.check_out_date::date > p_audit_date
    LOOP
        v_charge_amount := v_booking.base_rate * (1 + (p_tax_rate / 100.0));
        
        -- Insert into extra charges for itemized tracking
        INSERT INTO extra_charges (booking_id, description, amount)
        VALUES (v_booking.booking_id, 'Room & Tax - ' || p_audit_date::text, v_charge_amount);
        
        -- Increment booking total_bill
        UPDATE bookings SET total_bill = COALESCE(total_bill, 0) + v_charge_amount WHERE id = v_booking.booking_id;

        v_total_revenue := v_total_revenue + v_charge_amount;
        v_occupancy := v_occupancy + 1;
    END LOOP;

    -- Insert log
    INSERT INTO night_audit_logs (audit_date, manager_id, total_room_revenue, total_occupancy)
    VALUES (p_audit_date, p_manager_id, v_total_revenue, v_occupancy);

    v_result := jsonb_build_object(
        'success', true,
        'audit_date', p_audit_date,
        'revenue_posted', v_total_revenue,
        'occupancy', v_occupancy,
        'message', 'Night audit completed successfully'
    );

    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    -- In PostgreSQL, any unhandled exception in a PL/pgSQL block rolls back the surrounding transaction automatically.
    -- We can raise it further so the Supabase client receives the error.
    RAISE;
END;
$$;
