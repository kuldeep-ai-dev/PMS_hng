'use client';

import { createClient } from '@/utils/supabase/client';

export async function clearCanceledBookings() {
    const supabase = createClient();
    const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('status', 'Canceled');

    if (error) throw error;
    return true;
}

export async function clearAllBookings() {
    const supabase = createClient();

    // 1. Reset room statuses to Available
    await supabase.from('rooms').update({ status: 'Available' }).neq('id', '0');

    // 2. Clear bookings
    const { error } = await supabase
        .from('bookings')
        .delete()
        .neq('id', '0'); // Safe delete for all

    if (error) throw error;
    return true;
}
