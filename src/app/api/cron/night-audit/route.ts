import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSettings } from '@/app/(dashboard)/settings/actions';

// Use Admin client for Cron to ensure it has bypass powers
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
    try {
        // 1. Security check (Allow Vercel Cron or a secret key)
        const authHeader = req.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Get Current IST Date
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const todayIST = new Date(now.getTime() + istOffset);
        todayIST.setUTCHours(0, 0, 0, 0);

        const todayStr = todayIST.toISOString().split('T')[0];

        // 3. Get a valid admin/manager ID for the logs
        const { data: admin } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .in('role', ['admin', 'manager', 'owner'])
            .limit(1)
            .single();

        const managerId = admin?.id;
        if (!managerId) {
            return NextResponse.json({ error: 'No valid admin/manager profile found' }, { status: 500 });
        }

        // 4. Get Latest Audit Date from DB
        const { data: latestAudit } = await supabaseAdmin
            .from('night_audit_logs')
            .select('audit_date')
            .order('audit_date', { ascending: false })
            .limit(1)
            .single();

        let businessDate: Date;
        if (!latestAudit) {
            // If no audit logs, start from yesterday? 
            // Better to default to a safe value or error out.
            return NextResponse.json({ error: 'No previous audit logs found. Cannot determine start date.' }, { status: 500 });
        } else {
            // If last audit was 2026-04-06, system date is currently 2026-04-07.
            // We need to run audit FOR 2026-04-07 to move to 2026-04-08.
            const lastAudit = new Date(latestAudit.audit_date + 'T00:00:00Z');
            businessDate = new Date(lastAudit.getTime() + 86400000);
        }

        const results = [];
        const settings = await getSettings();

        // 5. Catch-up Loop: Roll until Business Date matches Today IST
        while (businessDate < todayIST) {
            const auditDateStr = businessDate.toISOString().split('T')[0];
            const nextDay = new Date(businessDate.getTime() + 86400000);
            const nextDayStr = nextDay.toISOString().split('T')[0];

            console.log(`[Cron] Cleaning ghost orders for: ${auditDateStr}`);

            // CLEANUP: Cancel any orders from this date that were never billed/paid
            await supabaseAdmin
                .from('restaurant_orders')
                .update({ status: 'cancelled' })
                .gte('order_time', `${auditDateStr}T00:00:00Z`)
                .lt('order_time', `${nextDayStr}T00:00:00Z`)
                .eq('payment_status', 'unpaid')
                .not('status', 'in', '("billed","completed","cancelled")');

            console.log(`[Cron] Rolling date for: ${auditDateStr}`);

            const { data, error } = await supabaseAdmin.rpc('execute_night_audit', {
                p_audit_date: auditDateStr,
                p_manager_id: managerId,
                p_rates: {
                    free_pax_limit: settings.free_pax_limit,
                    extra_pax_rate: settings.extra_pax_rate,
                    extra_bed_rate: settings.extra_bed_rate,
                    meal_plan_rates: settings.meal_plan_rates
                }
            });

            if (error) {
                console.error(`[Cron] Failed for ${auditDateStr}:`, error);
                results.push({ date: auditDateStr, success: false, error: error.message });
                break; // Stop loop on failure
            }

            results.push({ date: auditDateStr, success: true, data });

            // Move to next day
            businessDate = new Date(businessDate.getTime() + 86400000);
        }

        return NextResponse.json({
            success: true,
            message: results.length > 0 ? `Executed ${results.length} rolls` : 'Date is already up to date',
            details: results,
            targetDate: todayStr
        });

    } catch (error: any) {
        console.error('[Cron Error]:', error);
        return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
    }
}
