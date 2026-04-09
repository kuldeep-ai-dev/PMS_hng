'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { getSettings } from '@/app/(dashboard)/settings/actions';

export async function getBusinessDate() {
    // Return current date in IST
    const now = new Date();
    // Offset for IST (UTC+5:30)
    // IST is 5.5 hours ahead of UTC
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);

    // Set to midnight IST
    istDate.setUTCHours(0, 0, 0, 0);
    return istDate;
}

export async function getPreflightStatus(auditDate: string) {
    const supabase = await createClient();

    // 1. Unposted POS charges
    const { count: unpaidPos, error: err1 } = await supabase
        .from('restaurant_orders')
        .select('*', { count: 'exact', head: true })
        .eq('payment_status', 'unpaid')
        .neq('status', 'cancelled');

    // 2. Guests overstayed checkout (Active but check_out_date is in the past OR belongs to exactly the audit date)
    const { count: overstayedGuests, error: err2 } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Active')
        .lte('check_out_date', auditDate + 'T23:59:59Z');

    // 3. Open folios with zeroed payments / unsettled checkouts
    const { count: unsettledCheckouts, error: err3 } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Checked_Out')
        .eq('is_settled', false)
        .eq('bill_to_company', false) // City ledger is fine
        .gte('check_out_date', auditDate + 'T00:00:00Z')
        .lt('check_out_date', auditDate + 'T23:59:59Z');

    return {
        unpaidPos: unpaidPos || 0,
        overstayedGuests: overstayedGuests || 0,
        unsettledCheckouts: unsettledCheckouts || 0,
        canRoll: (unpaidPos === 0 && overstayedGuests === 0 && unsettledCheckouts === 0),
        errors: [err1?.message, err2?.message, err3?.message].filter(Boolean) as string[]
    };
}

export async function executeRollDate(auditDate: string) {
    const supabase = await createClient();

    // Get admin user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // Fetch profile ID for the user
    const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).single();

    const s = await getSettings();
    const { data, error } = await supabase.rpc('execute_night_audit', {
        p_audit_date: auditDate,
        p_manager_id: profile?.id || user.id,
        p_rates: {
            free_pax_limit: s.free_pax_limit,
            extra_pax_rate: s.extra_pax_rate,
            extra_bed_rate: s.extra_bed_rate,
            meal_plan_rates: s.meal_plan_rates
        }
    });

    if (error) throw error;

    revalidatePath('/admin');
    return data;
}

export async function generateFlashReportData(auditDate: string) {
    const supabase = await createClient();

    const { data: auditLog, error: logErr } = await supabase
        .from('night_audit_logs')
        .select('*')
        .eq('audit_date', auditDate)
        .single();

    if (logErr) throw new Error('Audit log not found for ' + auditDate);

    // Fetch Manager
    const { data: managerProfile } = await supabase.from('profiles').select('name, role').eq('id', auditLog.manager_id).single();

    // Total Rooms (Exclude Blocked rooms since they are formally out of inventory)
    const { count: totalRooms } = await supabase.from('rooms')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'Blocked');

    // Ledgers Calculation
    const { data: activeBookings } = await supabase.from('bookings').select('id, total_bill').eq('status', 'Active');
    const bIdActive = activeBookings?.map(b => b.id) || [];
    const { data: activePayments } = await supabase.from('payments').select('amount').in('booking_id', bIdActive);
    const guestLedger = (activeBookings?.reduce((sum: number, b: any) => sum + (Number(b.total_bill) || 0), 0) || 0)
        - (activePayments?.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0) || 0);

    const { data: cityBookings } = await supabase.from('bookings').select('id, total_bill').eq('status', 'Checked_Out').eq('bill_to_company', true).eq('is_settled', false);
    const bIdCity = cityBookings?.map(b => b.id) || [];
    const { data: cityPayments } = await supabase.from('payments').select('amount').in('booking_id', bIdCity);
    const cityLedger = (cityBookings?.reduce((sum: number, b: any) => sum + (Number(b.total_bill) || 0), 0) || 0)
        - (cityPayments?.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0) || 0);

    const { data: futureBookings } = await supabase.from('bookings').select('advance_payment').gt('check_in_date', auditDate + 'T23:59:59Z');
    const depositLedger = futureBookings?.reduce((sum: number, b: any) => sum + (Number(b.advance_payment) || 0), 0) || 0;

    const reportData = {
        auditDate,
        occupancy: auditLog.total_occupancy,
        totalRooms: totalRooms || 0,
        occupancyRate: totalRooms ? ((auditLog.total_occupancy / totalRooms) * 100).toFixed(2) + '%' : '0%',
        roomRevenue: Number(auditLog.total_room_revenue) || 0,
        adr: auditLog.total_occupancy > 0 ? (Number(auditLog.total_room_revenue) / auditLog.total_occupancy).toFixed(2) : 0,
        revPar: totalRooms ? (Number(auditLog.total_room_revenue) / totalRooms).toFixed(2) : 0,
        managerId: auditLog.manager_id,
        managerName: managerProfile?.name || 'System Administrator',
        managerRole: managerProfile?.role || 'Admin',
        runAt: auditLog.created_at,
        ledgers: {
            guestLedger,
            cityLedger,
            depositLedger
        }
    };

    return reportData;
}
