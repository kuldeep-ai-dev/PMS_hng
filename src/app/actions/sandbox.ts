'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

/**
 * Toggles the global Sandbox Mode state in the hotel_settings table.
 * If toggling OFF, it automatically triggers a purge of all sandbox data.
 */
export async function toggleSandboxModeAction(enabled: boolean) {
    console.log(`[Sandbox] Toggling mode to: ${enabled ? 'ON' : 'OFF'}`);
    const supabase = createAdminClient();
    
    try {
        // 1. Fetch current settings and snapshot if needed
        const { data: settings } = await supabase.from('hotel_settings').select('id, sandbox_snapshot').single();

        // 2. If turning ON, take a snapshot of production state
        if (enabled) {
            console.log('[Sandbox] Taking production state snapshot...');
            const snapshot = await takeStateSnapshot(supabase);
            const { error: snapErr } = await supabase
                .from('hotel_settings')
                .update({ 
                    is_sandbox_mode: true,
                    sandbox_snapshot: snapshot 
                })
                .eq('id', settings?.id);
            if (snapErr) throw snapErr;
        } else {
            // 3. If turning OFF, restore state from snapshot BEFORE purging data
            console.log('[Sandbox] Restoring state from snapshot...');
            await restoreStateFromSnapshot(supabase, settings?.sandbox_snapshot);

            // 4. Update mode to OFF and clear snapshot
            const { error: settingsError } = await supabase
                .from('hotel_settings')
                .update({ 
                    is_sandbox_mode: false,
                    sandbox_snapshot: null 
                })
                .eq('id', settings?.id);
            if (settingsError) throw settingsError;

            // 5. Cleanup ALL sandbox database records
            console.log('[Sandbox] Triggering automatic transactional data purge...');
            const purgeResult = await purgeSandboxDataAction();
            if (!purgeResult.success) {
                console.error('[Sandbox] Automated purge failed:', purgeResult.error);
            }
        }

        revalidatePath('/', 'layout');
        revalidatePath('/settings');
        
        return { success: true, mode: enabled ? 'Sandbox' : 'Production' };
    } catch (err: any) {
        console.error('[Sandbox] Toggle error:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Permanently deletes all records marked as test data.
 */
export async function purgeSandboxDataAction() {
    const supabase = createAdminClient();
    console.log('[Sandbox] Purging all test data...');
    
    try {
        const tables = [
            'debug_log', 'companies', 'guests', 'cleaning_assignments', 'payments', 
            'bookings', 'website_bookings', 'rooms', 'extra_charges', 'profiles', 
            'room_transfers', 'restaurant_orders', 'restaurant_customers', 'lost_and_found', 
            'night_audit_logs', 'restaurant_categories', 'restaurant_menu_items', 
            'restaurant_order_items', 'room_blocks', 'restaurant_tables', 
            'restaurant_loyalty_transactions', 'inventory_categories', 'inventory_vendors', 
            'inventory_recipes', 'system_license', 'license_renewal_requests', 
            'system_activity_logs', 'whatsapp_analytics', 'staff_attendance', 
            'marketing_campaigns', 'restaurant_loyalty_settings', 'restaurant_reservations', 
            'restaurant_settings', 'restaurant_loyalty_wallets', 'inventory_items', 
            'inventory_purchase_orders', 'inventory_po_items', 'inventory_wastage', 
            'inventory_audits', 'staff_activity_logs', 'leads'
        ];

        const results = [];
        for (const table of tables) {
            const { error } = await supabase
                .from(table)
                .delete()
                .eq('is_test_data', true);
            
            if (error) {
                console.error(`[Sandbox] Failed to purge table ${table}:`, error.message);
                results.push({ table, success: false, error: error.message });
            } else {
                results.push({ table, success: true });
            }
        }

        const failed = results.filter(r => !r.success);
        if (failed.length > 0) {
            return { 
                success: false, 
                error: `Failed to clear some tables: ${failed.map(f => f.table).join(', ')}` 
            };
        }

        return { success: true, message: 'Sandbox environment wiped clean.' };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Takes a snapshot of shared mutable assets (Rooms, Inventory, Tables).
 */
async function takeStateSnapshot(supabase: any) {
    const [rooms, inventory, tables] = await Promise.all([
        supabase.from('rooms').select('id, status, blocked_reason'),
        supabase.from('inventory_items').select('id, current_stock'),
        supabase.from('restaurant_tables').select('id, status')
    ]);

    return {
        rooms: rooms.data || [],
        inventory: inventory.data || [],
        tables: tables.data || []
    };
}

/**
 * Restores shared mutable assets from a snapshot.
 */
async function restoreStateFromSnapshot(supabase: any, snapshot: any) {
    if (!snapshot) {
        console.warn('[Sandbox] No snapshot found to restore.');
        return;
    }

    try {
        // Restore Rooms
        if (snapshot.rooms?.length > 0) {
            for (const room of snapshot.rooms) {
                await supabase.from('rooms').update({ 
                    status: room.status, 
                    blocked_reason: room.blocked_reason 
                }).eq('id', room.id);
            }
        }

        // Restore Inventory
        if (snapshot.inventory?.length > 0) {
            for (const item of snapshot.inventory) {
                await supabase.from('inventory_items').update({ 
                    current_stock: item.current_stock 
                }).eq('id', item.id);
            }
        }

        // Restore Restaurant Tables
        if (snapshot.tables?.length > 0) {
            for (const table of snapshot.tables) {
                await supabase.from('restaurant_tables').update({ 
                    status: table.status 
                }).eq('id', table.id);
            }
        }
        
        console.log('[Sandbox] Asset state restoration complete.');
    } catch (err: any) {
        console.error('[Sandbox] State restoration failed:', err.message);
    }
}
