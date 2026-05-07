'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getReservations(date?: string) {
    const supabase = await createClient();
    let query = supabase.from('restaurant_reservations')
        .select('*, table:restaurant_tables(table_number)')
        .order('reservation_time', { ascending: true });

    if (date) {
        const start = `${date}T00:00:00Z`;
        const end = `${date}T23:59:59Z`;
        query = query.gte('reservation_time', start).lte('reservation_time', end);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
}

export async function addReservation(reservation: {
    table_id: string;
    guest_name: string;
    phone: string;
    pax: number;
    reservation_time: string;
    notes?: string;
}) {
    const supabase = await createClient();
    const { data, error } = await supabase.from('restaurant_reservations').insert([reservation]).select().single();
    if (error) throw error;

    revalidatePath('/restaurant/reservations');
    revalidatePath('/restaurant'); // Update dashboard
    return data;
}

export async function updateReservationStatus(id: string, status: 'confirmed' | 'seated' | 'cancelled' | 'no-show', tableId?: string) {
    const supabase = await createClient();
    const { error } = await supabase.from('restaurant_reservations').update({ status }).eq('id', id);
    if (error) throw error;

    // If seated, mark table as occupied
    if (status === 'seated' && tableId) {
        await supabase.from('restaurant_tables').update({ status: 'occupied' }).eq('id', tableId);
    }

    revalidatePath('/restaurant/reservations');
    revalidatePath('/restaurant');
    return { success: true };
}

export async function deleteReservation(id: string) {
    const supabase = await createClient();
    const { error } = await supabase.from('restaurant_reservations').delete().eq('id', id);
    if (error) throw error;

    revalidatePath('/restaurant/reservations');
    return { success: true };
}
