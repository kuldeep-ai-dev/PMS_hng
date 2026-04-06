'use client';

import { createClient } from '@/utils/supabase/client';

export async function submitAdvanceBooking(formData: any) {
    const supabase = createClient();

    // 1. Resolve/Upsert Guest
    let guestId = formData.guest_id;
    const guestPayload = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        preferences: formData.preferences,
        guest_type: formData.guest_type || 'Standard',
        pin_code: formData.pin_code,
        city: formData.city,
        state: formData.state,
        country: formData.country || 'India',
        is_foreign: formData.is_foreign || false,
        passport_number: formData.passport_number,
        guide_name: formData.guide_name,
        guide_phone: formData.guide_phone,
        dob: formData.dob || null,
        age: formData.age || null,
        ...(formData.id_document_url ? { id_image_url: formData.id_document_url } : {}),
    };

    let guest;
    if (guestId) {
        const { data, error: guestError } = await supabase
            .from('guests')
            .update(guestPayload)
            .eq('id', guestId)
            .select()
            .single();
        if (guestError) throw guestError;
        guest = data;
    } else {
        const { data: existingGuest } = await supabase
            .from('guests')
            .select('id')
            .eq('phone', formData.phone)
            .maybeSingle();

        if (existingGuest) {
            const { data, error: guestError } = await supabase
                .from('guests')
                .update(guestPayload)
                .eq('id', existingGuest.id)
                .select()
                .single();
            if (guestError) throw guestError;
            guest = data;
        } else {
            const { data, error: guestError } = await supabase
                .from('guests')
                .insert(guestPayload)
                .select()
                .single();
            if (guestError) throw guestError;
            guest = data;
        }
    }

    // 2. Create Booking (Status: Advance_Booking)
    const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
            guest_id: guest.id,
            room_id: formData.room_id,
            check_in_date: formData.check_in_date,
            check_out_date: formData.check_out_date,
            purpose_of_visit: formData.purpose_of_visit || 'Leisure',
            advance_payment: formData.advance_payment || 0,
            advance_payment_mode: formData.advance_payment_mode || 'Cash',
            gst_type: formData.gst_type || 'B2C',
            gstin: formData.gstin || null,
            total_bill: formData.total_bill || 0,
            status: 'Advance_Booking',
            extra_beds: formData.extra_beds || 0,
            discount_amount: formData.discount_amount || 0,
            food_plan: formData.food_plan || 'EP',
            pax_count: formData.pax_count || 1,
            accompanying_guests: formData.accompanying_guests || [],
            company_id: formData.company_id || null,
            coming_from: formData.coming_from || null,
            next_destination: formData.next_destination || null,
            booking_source: formData.booking_source || 'Walk-In',
            ota_booking_id: formData.ota_booking_id || null
        })
        .select()
        .single();

    if (bookingError) throw bookingError;

    // NOTE: We do NOT update the room status to 'Occupied' for advance bookings.
    // The room remains 'Available' until actual check-in.

    return booking;
}

export async function getAdvanceBookings() {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('bookings')
        .select(`
            *,
            guests (name, phone),
            rooms (number, type)
        `)
        .eq('status', 'Advance_Booking')
        .order('check_in_date', { ascending: true });

    if (error) throw error;
    return data;
}

export async function getAdvanceAvailableRooms(checkIn: string, checkOut: string) {
    const supabase = createClient();

    // 1. Fetch all rooms that are NOT Maintenance or Blocked
    const { data: allRooms, error: roomsError } = await supabase
        .from('rooms')
        .select('*')
        .neq('status', 'Maintenance')
        .neq('status', 'Blocked');
    if (roomsError) throw roomsError;

    // 2. Fetch all bookings that overlap with the selected date range
    // Overlap if: booking.check_in < newCheckOut AND booking.check_out > newCheckIn
    const { data: overlaps, error: overlapError } = await supabase
        .from('bookings')
        .select('room_id')
        .in('status', ['Advance_Booking', 'Active'])
        .lt('check_in_date', checkOut)
        .gt('check_out_date', checkIn);

    if (overlapError) throw overlapError;

    const bookedRoomIds = new Set(overlaps?.map(o => o.room_id) || []);

    // 3. Filter rooms
    return allRooms.filter(r => !bookedRoomIds.has(r.id));
}

export async function processCancellation(bookingId: string, refundAmount: number = 0, reason: string = '') {
    const supabase = createClient();

    // 1. Get booking details for logging
    const { data: booking, error: getError } = await supabase
        .from('bookings')
        .select('*, guests(name), rooms(number)')
        .eq('id', bookingId)
        .single();
    if (getError) throw getError;

    // 2. Update status to Cancelled
    const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'Cancelled' })
        .eq('id', bookingId);
    if (updateError) throw updateError;

    // 3. Log refund if applicable
    if (refundAmount > 0) {
        const { error: payError } = await supabase
            .from('payments')
            .insert({
                booking_id: bookingId,
                amount: -refundAmount, // Negative amount for refund
                payment_method: 'Cash', // Default
                payment_type: 'Refund',
                notes: `advance booking room refund - Guest: ${booking.guests?.name}, Room: ${booking.rooms?.number}, Reason: ${reason}`
            });
        if (payError) throw payError;
    }

    return true;
}
