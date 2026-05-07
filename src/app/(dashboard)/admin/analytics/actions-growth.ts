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

    // 1. Fetch bookings & Rooms for growth trends
    const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*, guests(id)')
        .gte('created_at', twelveMonthsAgo)
        .order('created_at', { ascending: true });

    const { data: rooms } = await supabase.from('rooms').select('id');
    const totalRoomsCount = rooms?.length || 30;

    if (error) {
        console.error('[Growth Analytics] Error:', error.message);
        return null;
    }

    const all = bookings || [];

    // 2. Monthly Metrics (RevPAR, ADR)
    const monthInterval = eachMonthOfInterval({
        start: subMonths(getISTDate(), 11),
        end: getISTDate()
    });

    const monthlyGrowth = monthInterval.map(month => {
        const start = startOfMonth(month);
        const end = endOfMonth(month);
        const monthLabel = format(month, 'MMM yy');

        const monthlyBookings = all.filter(b => {
            if (!b.check_in_date) return false;
            const bStart = new Date(b.check_in_date);
            if (isNaN(bStart.getTime())) return false;
            return (bStart >= start && bStart <= end);
        });

        const totalRevenue = monthlyBookings.reduce((acc, b) => acc + (Number(b.total_bill) || 0), 0);
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
    all.forEach(b => {
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
