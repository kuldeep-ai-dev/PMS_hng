'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import { getISTDayRange } from '@/utils/date';
import { getSettings } from '@/app/(dashboard)/settings/actions';

/**
 * Robust report generation with sandbox awareness and proper tax logic.
 */

async function getSandboxFilter() {
    const settings = await getSettings();
    return settings.is_sandbox_mode || false;
}

export async function getOperationalReportData(type: string, date: string) {
    const supabase = createAdminClient();
    const { start, end } = getISTDayRange(date);
    const isSandbox = await getSandboxFilter();

    let query = supabase.from('bookings').select('*, guests(name, phone), rooms(number)');

    // Always filter by test data status
    query = query.eq('is_test_data', isSandbox);

    const { data: bookings, error } = await (async () => {
        switch (type) {
            case 'arrivals':
                return await query
                    .gte('check_in_date', start)
                    .lte('check_in_date', end)
                    .in('status', ['Advance_Booking', 'Confirmed']);

            case 'departures':
                return await query
                    .gte('check_out_date', start)
                    .lte('check_out_date', end)
                    .in('status', ['Active']);

            case 'in-house':
                return await query
                    .eq('status', 'Active');

            case 'no-shows':
                return await query
                    .gte('check_in_date', start)
                    .lte('check_in_date', end)
                    .eq('status', 'No_Show');

            case 'housekeeping':
                const rooms = await supabase
                    .from('rooms')
                    .select('*')
                    .eq('is_test_data', isSandbox)
                    .order('number', { ascending: true });
                return { data: rooms.data, error: rooms.error };

            default:
                return { data: [], error: 'Invalid report type' };
        }
    })();

    if (error) return { error };

    // Calculate pending balance for each booking
    const enrichedData = await Promise.all((bookings || []).map(async (b: any) => {
        if (type === 'housekeeping') return b;

        // Fetch all payments for this booking
        const { data: pData } = await supabase
            .from('payments')
            .select('amount')
            .eq('booking_id', b.id)
            .eq('is_refund', false);

        const totalPaid = (pData || []).reduce((sum, p) => sum + Number(p.amount), 0);
        const totalBill = Number(b.total_bill || 0);

        return {
            ...b,
            pending_balance: Math.max(0, totalBill - totalPaid)
        };
    }));

    return { data: enrichedData };
}

export async function getFinancialReportData(type: string, date: string) {
    const supabase = createAdminClient();
    const { start, end } = getISTDayRange(date);
    const isSandbox = await getSandboxFilter();
    const settings = await getSettings();

    switch (type) {
        case 'flash':
            const [payments, restOrders, rooms] = await Promise.all([
                supabase.from('payments')
                    .select('amount')
                    .gte('created_at', start)
                    .lt('created_at', end)
                    .eq('is_refund', false)
                    .eq('is_test_data', isSandbox),
                supabase.from('restaurant_orders')
                    .select('total_amount_sum:total_amount.sum()') // Hypothetical sum, but we'll reduce
                    .select('total_amount')
                    .gte('order_time', start)
                    .lt('order_time', end)
                    .in('payment_status', ['paid', 'charged_to_room'])
                    .eq('is_test_data', isSandbox),
                supabase.from('rooms')
                    .select('id, status')
                    .eq('is_test_data', isSandbox)
            ]);

            const roomRev = payments.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
            const restRev = restOrders.data?.reduce((sum, o: any) => sum + Number(o.total_amount), 0) || 0;
            const totalRev = roomRev + restRev;

            // Inclusive GST calculation based on hotel settings
            const cgRate = settings.cgst_rate || 6;
            const sgRate = settings.sgst_rate || 6;
            const tRate = (cgRate + sgRate) / 100;
            const netR = totalRev / (1 + tRate);
            const gstA = totalRev - netR;

            const totalRooms = rooms.data?.length || 0;
            const occupiedRooms = rooms.data?.filter(r => r.status === 'Occupied').length || 0;
            const occRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;
            const adr = occupiedRooms > 0 ? roomRev / occupiedRooms : 0;
            const revPar = totalRooms > 0 ? roomRev / totalRooms : 0;

            return {
                data: {
                    totalRevenue: totalRev,
                    roomRevenue: roomRev,
                    restaurantRevenue: restRev,
                    occupancyRate: occRate,
                    adr,
                    revPar,
                    totalRooms,
                    occupiedRooms,
                    gstAmount: gstA,
                    netRevenue: netR,
                    cgst: gstA / 2,
                    sgst: gstA / 2
                }
            };

        case 'transactions':
            return await supabase
                .from('payments')
                .select('*, bookings(guests(name), rooms(number))')
                .gte('created_at', start)
                .lt('created_at', end)
                .eq('is_test_data', isSandbox)
                .order('created_at', { ascending: false });

        case 'tax':
            const paymentList = await supabase
                .from('payments')
                .select('amount, tax_amount')
                .gte('created_at', start)
                .lt('created_at', end)
                .eq('is_refund', false)
                .eq('is_test_data', isSandbox);

            const totalAmount = paymentList.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
            const stTax = paymentList.data?.reduce((sum, p) => sum + Number(p.tax_amount || 0), 0) || 0;

            const cR = settings.cgst_rate || 6;
            const sR = settings.sgst_rate || 6;
            const tR = (cR + sR) / 100;

            const calculatedTax = stTax > 0 ? stTax : (totalAmount * (tR / (1 + tR)));

            return {
                data: {
                    totalRevenue: totalAmount,
                    gstAmount: calculatedTax,
                    netRevenue: totalAmount - calculatedTax,
                    cgst: calculatedTax / 2,
                    sgst: calculatedTax / 2
                }
            };

        default:
            return { data: [], error: 'Invalid report type' };
    }
}
