'use server'

import { createClient } from '@/utils/supabase/server';

export async function getCheckedInBookings() {
    const supabase = await createClient();

    // Fetch rooms and their bookings (this pattern is proven to work in FrontDeskPage)
    const { data: rooms, error } = await supabase
        .from('rooms')
        .select(`
            *,
            bookings (
                *,
                guests (*),
                companies (*)
            )
        `)
        .order('number', { ascending: true });

    if (error) {
        console.error('GRC HUB FETCH ERROR:', error);
        throw error;
    }

    // Extract ALL bookings from all rooms
    const allBookings = (rooms || []).flatMap((r: any) =>
        (r.bookings || []).map((b: any) => ({
            ...b,
            rooms: {
                number: r.number,
                type: r.type,
                base_rate: r.base_rate,
                status: r.status
            }
        }))
    );

    // Filter for Active status ONLY for rooms that are currently Occupied
    const activeBookings = allBookings.filter((b: any) =>
        ['Active', 'Checked_In', 'Checked In'].includes(b.status) &&
        b.rooms.status === 'Occupied'
    );

    return activeBookings;
}

export async function getArchiveBookings(startDate?: string, endDate?: string) {
    const supabase = await createClient();

    let query = supabase
        .from('bookings')
        .select(`
            *,
            guests (*),
            rooms (*)
        `)
        .order('check_in_date', { ascending: false });

    if (startDate) {
        query = query.gte('check_in_date', startDate);
    }
    if (endDate) {
        query = query.lte('check_in_date', endDate);
    }

    const { data, error } = await query;

    if (error) {
        console.error('GRC ARCHIVE FETCH ERROR:', error);
        throw error;
    }

    return data || [];
}
