'use client';

import { createClient } from '@/utils/supabase/client';

export type RoomStatus = 'Available' | 'Occupied' | 'Dirty' | 'Maintenance';

export async function searchGuests(term: string) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('guests')
        .select('*')
        .or(`phone.ilike.%${term}%,name.ilike.%${term}%`)
        .order('name', { ascending: true })
        .limit(8);

    if (error) throw error;
    return data || [];
}

export async function getAvailableRooms() {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('status', 'Available')
        .order('number', { ascending: true });

    if (error) throw error;
    return data || [];
}

export async function checkRoomConflict(roomId: string, checkIn: string, checkOut: string, currentBookingId?: string) {
    const supabase = createClient();
    let query = supabase
        .from('bookings')
        .select(`
            id,
            check_in_date,
            check_out_date,
            status,
            guests (name)
        `)
        .eq('room_id', roomId)
        .in('status', ['Advance_Booking', 'Active'])
        .lt('check_in_date', checkOut)
        .gt('check_out_date', checkIn);

    if (currentBookingId) {
        query = query.neq('id', currentBookingId);
    }

    const { data: conflicts, error } = await query;

    if (error) throw error;
    return conflicts && conflicts.length > 0 ? conflicts[0] : null;
}

export async function getBookingById(id: string) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('bookings')
        .select(`
            *,
            guests (*),
            companies (*)
        `)
        .eq('id', id)
        .single();

    if (error) throw error;
    return data;
}

export async function submitCheckIn(formData: any, bookingId?: string) {
    const supabase = createClient();

    // 0. Check Sandbox Mode
    const { data: settings } = await supabase.from('hotel_settings').select('is_sandbox_mode').single();
    const isSandbox = settings?.is_sandbox_mode || false;

    // 1. Resolve/Upsert Guest
    let guestId = formData.guest_id;

    const guestPayload: any = {
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

    if (isSandbox) guestPayload.is_test_data = true;

    let guest;

    if (guestId) {
        // We have an explicit guest ID from the frontend selection
        const { data, error: guestError } = await supabase
            .from('guests')
            .update(guestPayload)
            .eq('id', guestId)
            .select()
            .single();
        if (guestError) throw guestError;
        guest = data;
    } else {
        // No guest ID provided, check for Phone match to decide between update or insert (Phone is unique)
        const { data: existingGuest } = await supabase
            .from('guests')
            .select('id')
            .eq('phone', formData.phone)
            .maybeSingle();

        if (existingGuest) {
            // Found guest by phone (returning guest), update their details
            const { data, error: guestError } = await supabase
                .from('guests')
                .update(guestPayload)
                .eq('id', existingGuest.id)
                .select()
                .single();
            if (guestError) throw guestError;
            guest = data;
        } else {
            // New phone number - create fresh record
            const { data, error: guestError } = await supabase
                .from('guests')
                .insert(guestPayload)
                .select()
                .single();
            if (guestError) throw guestError;
            guest = data;
        }
    }

    // 2. Create Lead for marketing opt-in (separate table)
    if (formData.opted_in) {
        try {
            await supabase.from('marketing_leads').upsert({
                full_name: formData.name,
                phone_number: formData.phone,
                email: formData.email,
                source: 'Check-in',
                status: 'active',
                is_test_data: isSandbox
            }, { onConflict: 'phone_number' });
        } catch { /* ignore lead insert failures */ }
    }

    // 3. Create Booking
    const serverNow = new Date();

    // Check-in: User-specified Date (YYYY-MM-DD) + Exact Server Time
    let finalCheckIn = new Date(serverNow);
    if (formData.check_in_date) {
        const [yyyy, mm, dd] = formData.check_in_date.split('-');
        finalCheckIn.setFullYear(Number(yyyy), Number(mm) - 1, Number(dd));
    }

    // Check-out: User-specified Date (YYYY-MM-DD) + 12:00 PM Standard Limit
    let finalCheckOut = new Date(finalCheckIn);
    finalCheckOut.setDate(finalCheckOut.getDate() + 1);
    finalCheckOut.setHours(12, 0, 0, 0);
    if (formData.check_out_date) {
        const [yyyy, mm, dd] = formData.check_out_date.split('-');
        finalCheckOut.setFullYear(Number(yyyy), Number(mm) - 1, Number(dd));
        finalCheckOut.setHours(12, 0, 0, 0);
    }

    const bookingPayload: any = {
        guest_id: guest.id,
        room_id: formData.room_id,
        check_in_date: finalCheckIn.toISOString(),
        check_out_date: finalCheckOut.toISOString(),
        purpose_of_visit: formData.purpose_of_visit,
        advance_payment: formData.advance_payment,
        advance_payment_mode: formData.advance_payment_mode,
        gst_type: formData.gst_type,
        gstin: formData.gstin,
        total_bill: formData.total_bill || 0,
        status: 'Active',
        extra_beds: formData.extra_beds || 0,
        discount_amount: formData.discount_amount || 0,
        food_plan: formData.food_plan || 'EP',
        pax_count: formData.pax_count || 1,
        accompanying_guests: formData.accompanying_guests || [],
        company_id: formData.company_id || null,
        coming_from: formData.coming_from || null,
        next_destination: formData.next_destination || null,
        booking_source: formData.booking_source || 'Walk-In',
        ota_booking_id: formData.ota_booking_id || null,
        early_check_in: formData.early_check_in || false,
        early_check_in_charge: formData.early_check_in_charge || 0,
        is_test_data: isSandbox
    };

    let booking;
    if (bookingId) {
        const { data, error: bookingError } = await supabase
            .from('bookings')
            .update(bookingPayload)
            .eq('id', bookingId)
            .select()
            .single();
        if (bookingError) throw bookingError;
        booking = data;
    } else {
        const { data, error: bookingError } = await supabase
            .from('bookings')
            .insert(bookingPayload)
            .select()
            .single();
        if (bookingError) throw bookingError;
        booking = data;
    }

    // 4. Update Room Status
    const { error: roomError } = await supabase
        .from('rooms')
        .update({ status: 'Occupied' })
        .eq('id', formData.room_id);

    if (roomError) throw roomError;

    // 5. Log Advance Payment in 'payments' table for accounting/analytics
    if (formData.advance_payment > 0) {
        const { error: paymentError } = await supabase
            .from('payments')
            .insert({
                booking_id: booking.id,
                amount: formData.advance_payment,
                method: formData.advance_payment_mode || 'Cash',
                is_test_data: isSandbox
            });

        if (paymentError) {
            console.error('[Check-in Payment Log] Error:', paymentError);
        }
    }

    return booking;
}
