'use server';

import { createClient } from '@/utils/supabase/server';
import {
    subMonths, format, startOfMonth, endOfMonth,
    eachMonthOfInterval, differenceInDays, subDays
} from 'date-fns';

export async function getTrendAnalytics() {
    const supabase = await createClient();

    // 1. Fetch bookings for the last 6 months
    const sixMonthsAgo = subMonths(new Date(), 6).toISOString();

    const { data: bookings, error: bError } = await supabase
        .from('bookings')
        .select('*')
        .gte('check_in_date', sixMonthsAgo);

    const { data: rooms, error: rError } = await supabase
        .from('rooms')
        .select('*');

    if (bError || rError) {
        console.error('[Trend Analytics] Error:', bError?.message || rError?.message);
        return null;
    }

    const all = bookings || [];
    const totalRooms = rooms?.length || 1;

    // 2. Average Lead Time Analysis
    const leadTimes = all.map(b => {
        const created = new Date(b.created_at);
        const checkin = new Date(b.check_in_date);
        return Math.max(0, differenceInDays(checkin, created));
    });
    const avgLeadTime = leadTimes.length > 0
        ? Math.round(leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length)
        : 0;

    // 3. Occupancy Trends (Last 6 Months)
    const sixMonthsInterval = eachMonthOfInterval({
        start: subMonths(new Date(), 5),
        end: new Date()
    });

    const occupancyTrends = sixMonthsInterval.map(month => {
        const start = startOfMonth(month);
        const end = endOfMonth(month);
        const monthLabel = format(month, 'MMM');

        // Find bookings that overlap with this month
        const monthlyBookings = all.filter(b => {
            const bStart = new Date(b.check_in_date);
            const bEnd = new Date(b.check_out_date);
            return (bStart <= end && bEnd >= start);
        });

        // Simple occupancy calculation (Total nights booked / Total available nights)
        // Assuming 30 rooms for this high-level trend
        const totalRoomNights = 30 * differenceInDays(end, start);
        const bookedNights = monthlyBookings.reduce((acc, b) => {
            const bStart = new Date(b.check_in_date);
            const bEnd = new Date(b.check_out_date);
            const overlapStart = bStart < start ? start : bStart;
            const overlapEnd = bEnd > end ? end : bEnd;
            return acc + Math.max(0, differenceInDays(overlapEnd, overlapStart));
        }, 0);

        return {
            date: monthLabel,
            occupancy: Math.min(100, Math.round((bookedNights / totalRoomNights) * 100)),
            bookings: monthlyBookings.length
        };
    });

    // 4. Booking Sources
    const sourceMap: Record<string, number> = {};
    all.forEach(b => {
        const s = b.source || 'Direct';
        sourceMap[s] = (sourceMap[s] || 0) + 1;
    });
    const sourceDistribution = Object.entries(sourceMap).map(([name, value]) => ({ name, value }));

    // 5. Lead Time Brackets
    const brackets = { '0-1 day': 0, '2-7 days': 0, '8-14 days': 0, '15-30 days': 0, '30+ days': 0 };
    leadTimes.forEach(lt => {
        if (lt <= 1) brackets['0-1 day']++;
        else if (lt <= 7) brackets['2-7 days']++;
        else if (lt <= 14) brackets['8-14 days']++;
        else if (lt <= 30) brackets['15-30 days']++;
        else brackets['30+ days']++;
    });
    const leadTimeData = Object.entries(brackets).map(([name, value]) => ({ name, value }));

    return {
        avgLeadTime,
        occupancyTrends,
        sourceDistribution,
        leadTimeData,
        totalBookings: all.length,
        cancelledBookings: all.filter(b => b.status === 'cancelled').length
    };
}
