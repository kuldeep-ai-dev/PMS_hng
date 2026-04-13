-- Update execute_night_audit to remove automatic tax calculation and rename charge
CREATE OR REPLACE FUNCTION execute_night_audit(
    p_audit_date DATE, 
    p_manager_id UUID,
    p_rates JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    v_booking RECORD;
    v_charge_amount NUMERIC;
    v_total_revenue NUMERIC := 0;
    v_occupancy INT := 0;
    v_result JSONB;
    v_base_rate NUMERIC;
    v_extra_pax_rate NUMERIC;
    v_extra_bed_rate NUMERIC;
    v_meal_plan_rate NUMERIC;
BEGIN
    -- Check if audit for this date is already run
    IF EXISTS (SELECT 1 FROM night_audit_logs WHERE audit_date = p_audit_date) THEN
        RAISE EXCEPTION 'Night audit for % has already been executed.', p_audit_date;
    END IF;

    -- Extract default rates from p_rates if provided
    v_extra_pax_rate := (p_rates->>'extra_pax_rate')::NUMERIC;
    v_extra_bed_rate := (p_rates->>'extra_bed_rate')::NUMERIC;

    -- Loop through active in-house bookings
    FOR v_booking IN 
        SELECT b.id AS booking_id, b.room_id, r.base_rate, b.guest_id, b.pax_count, b.extra_beds as extra_bed_count, b.food_plan as meal_plan
        FROM bookings b
        JOIN rooms r ON b.room_id = r.id
        WHERE b.status = 'Active'
            AND b.check_in_date::date <= p_audit_date
            AND b.check_out_date::date > p_audit_date
    LOOP
        -- Calculate Room Charge
        v_base_rate := v_booking.base_rate;
        
        -- Add Extra Pax charges if any
        IF v_booking.pax_count > (p_rates->>'free_pax_limit')::INT THEN
            v_base_rate := v_base_rate + ((v_booking.pax_count - (p_rates->>'free_pax_limit')::INT) * v_extra_pax_rate);
        END IF;

        -- Add Extra Bed charges (Corrected to use extra_beds count if available)
        IF v_booking.extra_bed_count > 0 THEN
            v_base_rate := v_base_rate + (v_booking.extra_bed_count * v_extra_bed_rate);
        END IF;

        -- Add Meal Plan rate
        v_meal_plan_rate := (p_rates->'meal_plan_rates'->>v_booking.meal_plan)::NUMERIC;
        IF v_meal_plan_rate IS NOT NULL THEN
            v_base_rate := v_base_rate + (v_meal_plan_rate * v_booking.pax_count);
        END IF;

        -- NO TAX ADDED AUTOMATICALLY HERE (User Request)
        v_charge_amount := v_base_rate; 
        
        -- Insert into extra charges for itemized tracking (Renamed to Room Charge)
        INSERT INTO extra_charges (booking_id, description, amount)
        VALUES (v_booking.booking_id, 'Room Charge - ' || p_audit_date::text, v_charge_amount);
        
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
        'message', 'Night audit completed successfully (Fixed: No auto-tax)'
    );

    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    RAISE;
END;
$$;
