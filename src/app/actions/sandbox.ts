'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

/**
 * Toggles the global Sandbox Mode in the settings table.
 */
export async function toggleSandboxMode(enabled: boolean) {
    const supabase = createAdminClient();
    
    // Explicitly update all settings rows (usually only 1)
    const { error } = await supabase
        .from('hotel_settings')
        .update({ is_sandbox_mode: enabled })
        .filter('id', 'neq', '00000000-0000-0000-0000-000000000000'); // Ensure we target the real setting

    if (error) {
        console.error('[Sandbox] Failed to toggle mode:', error.message);
        throw new Error(error.message);
    }

    // If turning OFF, automatically trigger a wipe of all test data
    if (!enabled) {
        await wipeTestData();
    }

    revalidatePath('/', 'layout');
    return { success: true };
}

/**
 * Permanently erases all records marked with is_test_data = true across all tables.
 */
export async function wipeTestData() {
    const supabase = createAdminClient();
    console.log('[Sandbox] Initiating complete wipe of test data...');

    // 1. Identify rooms that need resetting (those occupied by test bookings)
    const { data: testBookings } = await supabase
        .from('bookings')
        .select('room_id')
        .eq('is_test_data', true);

    const roomIdsToReset = testBookings?.map(b => b.room_id).filter(Boolean) || [];

    const tablesToClean = [
        'bookings',
        'payments',
        'extra_charges',
        'restaurant_orders',
        'restaurant_order_items',
        'room_blocks',
        'staff_attendance',
        'guests',
        'companies',
        'marketing_leads',
        'whatsapp_campaigns',
        'system_activity_logs',
        'lost_and_found',
        'marketing_campaigns'
    ];

    const results = await Promise.all(
        tablesToClean.map(async (table) => {
            const { error, count } = await supabase
                .from(table)
                .delete({ count: 'exact' })
                .eq('is_test_data', true);
            
            if (error && error.code !== '42703') { // Ignore "column does not exist" errors
                console.error(`[Sandbox] Failed to clean ${table}:`, error.message);
            }
            return { table, count };
        })
    );

    // 2. DEEP HEAL: Reset ANY room that is marked Occupied but has no Active booking
    console.log('[Sandbox] Running deep room status healing...');
    const { data: allRooms } = await supabase.from('rooms').select('id, number, status');
    const { data: activeBookings } = await supabase.from('bookings').select('room_id').eq('status', 'Active');
    
    const activeRoomIds = new Set(activeBookings?.map(b => b.room_id) || []);
    
    for (const room of (allRooms || [])) {
        // If room is marked Occupied but has no active booking, reset it
        if (room.status === 'Occupied' && !activeRoomIds.has(room.id)) {
            console.log(`[Sandbox] Healing Room ${room.number}: Occupied -> Available`);
            await supabase.from('rooms').update({ status: 'Available' }).eq('id', room.id);
        }
    }

    console.log('[Sandbox] Wipe and healing complete. Results:', results);
    revalidatePath('/', 'layout');
    return { success: true, results };
}
