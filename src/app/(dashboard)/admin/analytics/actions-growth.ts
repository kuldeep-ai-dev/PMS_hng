'use server';

import { createClient } from '@/utils/supabase/server';
import {
    subMonths, format, eachMonthOfInterval,
    startOfMonth, endOfMonth, differenceInDays
} from 'date-fns';
import { getISTDate } from '@/utils/date';

export async function getGrowthAnalytics() {
    const supabase = await createClient();
    const today = getISTDate();
    const twelveMonthsAgo = subMonths(today, 12).toISOString();

    // 1. Fetch bookings for guest analysis and counts
    const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*, guests(id)')
        .gte('created_at', twelveMonthsAgo)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('[Growth Analytics] Error:', error.message);
        return null;
    }

    // 1.1 Fetch ALL payments for revenue calculations
    const { data: allPayments, error: pError } = await supabase
        .from('payments')
        .select('*')
        .gte('created_at', twelveMonthsAgo);

    if (pError) {
        console.error('[Growth Analytics] Payments Error:', pError.message);
        return null;
    }

    const { data: rooms } = await supabase.from('rooms').select('id');
    const totalRoomsCount = rooms?.length || 30;

    const allBookings = bookings || [];
    const allPaymentsList = allPayments || [];

    // 2. Monthly Metrics (RevPAR, ADR)
    const monthInterval = eachMonthOfInterval({
        start: subMonths(getISTDate(), 11),
        end: getISTDate()
    });

    const monthlyGrowth = monthInterval.map(month => {
        const start = startOfMonth(month);
        const end = endOfMonth(month);
        const monthLabel = format(month, 'MMM yy');

        // Revenue from Payments
        const monthlyPayments = allPaymentsList.filter(p => {
            const date = new Date(p.created_at);
            return (date >= start && date <= end);
        });
        const totalRevenue = monthlyPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

        // Usage from Bookings (Sold count)
        const monthlyBookings = allBookings.filter(b => {
            if (!b.check_in_date) return false;
            const bStart = new Date(b.check_in_date);
            if (isNaN(bStart.getTime())) return false;
            return (bStart >= start && bStart <= end);
        });
        const roomsSold = monthlyBookings.length;

        // ADR (Average Daily Rate) = Revenue / Rooms Sold
        const adr = roomsSold > 0 ? Math.round(totalRevenue / roomsSold) : 0;

        // RevPAR (Revenue Per Available Room) = Revenue / Total Available Rooms
        const daysInMonth = differenceInDays(end, start) + 1;
        const totalInventory = totalRoomsCount * daysInMonth;
        const revpar = Math.round(totalRevenue / totalInventory);

        return {
            date: monthLabel,
            adr,
            revpar,
            revenue: totalRevenue
        };
    });

    // 3. Guest Retention Analysis
    const guestBookingCounts: Record<string, number> = {};
    allBookings.forEach(b => {
        const gid = b.guests?.id;
        if (gid) guestBookingCounts[gid] = (guestBookingCounts[gid] || 0) + 1;
    });

    const repeatGuests = Object.values(guestBookingCounts).filter(count => count > 1).length;
    const totalUniqueGuests = Object.keys(guestBookingCounts).length;
    const retentionRate = totalUniqueGuests > 0 ? Math.round((repeatGuests / totalUniqueGuests) * 100) : 0;

    return {
        adr: monthlyGrowth[monthlyGrowth.length - 1]?.adr || 0,
        revpar: monthlyGrowth[monthlyGrowth.length - 1]?.revpar || 0,
        retentionRate,
        monthlyGrowth,
        guestStats: [
            { name: 'Repeat Guests', value: repeatGuests },
            { name: 'New Guests', value: totalUniqueGuests - repeatGuests }
        ]
    };
}
