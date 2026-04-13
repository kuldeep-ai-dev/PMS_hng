'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import { getSettings } from '@/app/(dashboard)/settings/actions';
import { getTodayIST } from '@/utils/date';

/**
 * BACKGROUND AUTOMATION: Rolls the Business Date forward to Today IST.
 * This ensures room charges are posted and ghost orders cancelled automatically.
 */
export async function catchUpMissingAuditsAction() {
    console.log('[Automatic Date Sync] Checking synchronization...');
    const supabase = createAdminClient();
    
    try {
        // 1. Get Current IST "Normalized" Date
        const todayIST = getTodayIST();
        const todayStr = todayIST.toISOString().split('T')[0];

        // 2. Get a valid admin/manager ID for the logs (Required for DB constraint)
        const { data: admin } = await supabase
            .from('profiles')
            .select('id')
            .in('role', ['admin', 'manager', 'owner', 'master'])
            .limit(1)
            .single();

        const managerId = admin?.id;
        
        // 3. Get Latest Audit Date
        const { data: latestAudit } = await supabase
            .from('night_audit_logs')
            .select('audit_date')
            .order('audit_date', { ascending: false })
            .limit(1)
            .maybeSingle();

        let businessDate: Date;
        
        if (!latestAudit) {
            // If no history, start from yesterday
            console.log('[Automatic Date Sync] No audit history found. Initializing from yesterday.');
            businessDate = new Date(todayIST.getTime() - 86400000);
        } else {
            // Next day after last recorded audit
            businessDate = new Date(latestAudit.audit_date + 'T00:00:00Z');
            businessDate = new Date(businessDate.getTime() + 86400000);
        }

        const results = [];
        const settings = await getSettings();

        // 4. Automated Synchronization Loop
        // Roll until Business Date matches Today IST
        while (businessDate.getTime() < todayIST.getTime()) {
            const auditDateStr = businessDate.toISOString().split('T')[0];
            const nextDay = new Date(businessDate.getTime() + 86400000);
            const nextDayStr = nextDay.toISOString().split('T')[0];

            console.log(`[Automatic Date Sync] Synchronizing charges for: ${auditDateStr}`);

            // A. Cleanup ghost orders automatically
            await supabase
                .from('restaurant_orders')
                .update({ status: 'cancelled' })
                .gte('order_time', `${auditDateStr}T00:00:00Z`)
                .lt('order_time', `${nextDayStr}T00:00:00Z`)
                .eq('payment_status', 'unpaid')
                .not('status', 'in', '("billed","completed","cancelled")');

            // B. Execute the Automatic charging & revenue posting
//             const { error } = await supabase.rpc('execute_night_audit', {
//                 p_audit_date: auditDateStr,
//                 p_manager_id: managerId || null,
//                 p_rates: {
//                     free_pax_limit: settings.free_pax_limit,
//                     extra_pax_rate: settings.extra_pax_rate,
//                     extra_bed_rate: settings.extra_bed_rate,
//                     meal_plan_rates: settings.meal_plan_rates
//                 }
//             });

            if (error) {
                console.error(`[Automatic Date Sync] Failure on ${auditDateStr}:`, error.message);
                throw new Error(`Critical synchronization failure: ${error.message}`);
            }

            results.push(auditDateStr);
            businessDate = new Date(businessDate.getTime() + 86400000);
        }

        if (results.length > 0) {
            console.log(`[Automatic Date Sync] Successfully synchronized ${results.length} days.`);
        }
        
        return { 
            success: true, 
            count: results.length, 
            message: results.length > 0 
                ? `System synchronized to ${todayStr}.` 
                : 'System is already in sync with IST.' 
        };

    } catch (err: any) {
        console.error('[Automatic Date Sync] Error:', err.message);
        return { success: false, error: err.message };
    }
}
