'use client';

import { createClient } from '@/utils/supabase/client';
import { getISTDate } from '@/utils/date';

export interface TapeChartRoom {
    id: string;
    number: string;
    type: string;
    status: string;
}

export interface TapeChartBooking {
    id: string;
    guest_id: string;
    room_id: string;
    check_in_date: string;
    check_out_date: string;
    status: string;
    guest_name?: string;
}

export async function fetchBookingChartData() {
    const supabase = createClient();
    const today = getISTDate();
    today.setHours(0, 0, 0, 0);
    const windowEnd = new Date(today);
    windowEnd.setDate(windowEnd.getDate() + 14);

    // 1. Fetch all rooms
    const { data: rooms, error: roomsError } = await supabase
        .from('rooms')
        .select('*')
        .order('number', { ascending: true });

    if (roomsError) throw roomsError;

    // 2. Fetch all bookings that overlap with our 14 day window
    // (check_in <= windowEnd AND check_out >= today)
    const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
            *,
            guests ( name )
        `)
        .lte('check_in_date', windowEnd.toISOString())
        .gte('check_out_date', today.toISOString())
        .not('status', 'eq', 'Cancelled');

    if (bookingsError) throw bookingsError;

    // Map the guest names for easier rendering
    const formattedBookings: TapeChartBooking[] = bookings.map((b: any) => ({
        id: b.id,
        guest_id: b.guest_id,
        room_id: b.room_id,
        check_in_date: b.check_in_date,
        check_out_date: b.check_out_date,
        status: b.status,
        guest_name: b.guests?.name || 'Unknown'
    }));

    return {
        rooms: rooms as TapeChartRoom[],
        bookings: formattedBookings,
        startDate: today.toISOString()
    };
}
