'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import { getTodayIST } from '@/utils/date';

/**
 * BACKGROUND AUTOMATION: Synchronizes the system to Today IST.
 * This cleans up "Ghost" restaurant orders from previous days.
 */
export async function syncSystemDateAction() {
    const supabase = createAdminClient();
    
    try {
        const todayStr = getTodayIST();
        console.log(`[System Sync] Synchronizing to ${todayStr}...`);

        // Cleanup ghost orders (unpaid orders from YESTERDAY or earlier)
        const { error: cleanupError } = await supabase
            .from('restaurant_orders')
            .update({ status: 'cancelled' })
            .lt('order_time', `${todayStr}T00:00:00Z`)
            .eq('payment_status', 'unpaid')
            .not('status', 'in', '("billed","completed","cancelled")');

        if (cleanupError) throw cleanupError;

        return { 
            success: true, 
            message: 'System synchronized to IST Today.' 
        };

    } catch (err: any) {
        console.error('[System Sync] Error:', err.message);
        return { success: false, error: err.message };
    }
}
