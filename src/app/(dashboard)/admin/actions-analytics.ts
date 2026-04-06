'use client';

import { createClient } from '@/utils/supabase/client';
import {
    startOfDay, endOfDay,
    startOfWeek, endOfWeek,
    startOfMonth, endOfMonth,
    startOfYear, endOfYear,
    subDays, format
} from 'date-fns';
import { getISTTodayRange } from '@/utils/date-utils';

export interface RevenueMetrics {
    today: number;
    week: number;
    month: number;
    year: number;
    breakdown: { cash: number; card: number; online: number; };
}

export interface TrendData {
    date: string;
    hotelRevenue: number;
    restaurantRevenue: number;
    bookings: number;
}

export async function getPerformanceAnalytics() {
    const supabase = createClient();
    const { start: todayStart, end: todayEnd } = getISTTodayRange();
    const now = new Date();

    // Time boundaries
    const boundaries = {
        today: { start: todayStart, end: todayEnd },
        week: { start: startOfWeek(now, { weekStartsOn: 1 }).toISOString(), end: endOfWeek(now, { weekStartsOn: 1 }).toISOString() },
        month: { start: startOfMonth(now).toISOString(), end: endOfMonth(now).toISOString() },
        year: { start: startOfYear(now).toISOString(), end: endOfYear(now).toISOString() }
    };

    // 1. Fetch ALL relevant Bookings (for Hotel Revenue)
    const { data: allBookings, error: bError } = await supabase
        .from('bookings')
        .select('created_at, total_bill, advance_payment_mode')
        .gte('created_at', boundaries.year.start)
        .lte('created_at', boundaries.year.end);

    if (bError) throw bError;

    // 2. Fetch ALL relevant Orders (for Restaurant Revenue)
    // Filter out pending QR orders and cancelled orders
    const { data: allOrders, error: oError } = await supabase
        .from('restaurant_orders')
        .select('order_time, total_amount')
        .gte('order_time', boundaries.year.start)
        .lte('order_time', boundaries.year.end)
        .in('payment_status', ['paid', 'charged_to_room']);

    if (oError) throw oError;

    // Aggregators
    const hotelRevenue: RevenueMetrics = { today: 0, week: 0, month: 0, year: 0, breakdown: { cash: 0, card: 0, online: 0 } };
    const restaurantRevenue: RevenueMetrics = { today: 0, week: 0, month: 0, year: 0, breakdown: { cash: 0, card: 0, online: 0 } };

    // Calculate Hotel Metrics
    allBookings?.forEach(b => {
        const date = new Date(b.created_at);
        const amt = Number(b.total_bill || 0);
        const mode = b.advance_payment_mode as 'Cash' | 'Card' | 'Online';

        hotelRevenue.year += amt;
        if (date >= new Date(boundaries.month.start) && date <= new Date(boundaries.month.end)) hotelRevenue.month += amt;
        if (date >= new Date(boundaries.week.start) && date <= new Date(boundaries.week.end)) hotelRevenue.week += amt;

        if (date >= new Date(boundaries.today.start) && date <= new Date(boundaries.today.end)) {
            hotelRevenue.today += amt;
            if (mode === 'Cash') hotelRevenue.breakdown.cash += amt;
            else if (mode === 'Card') hotelRevenue.breakdown.card += amt;
            else if (mode === 'Online') hotelRevenue.breakdown.online += amt;
            else hotelRevenue.breakdown.cash += amt; // Fallback to cash if null
        }
    });

    // Calculate Restaurant Metrics
    allOrders?.forEach(o => {
        const date = new Date(o.order_time);
        const amt = Number(o.total_amount || 0);

        restaurantRevenue.year += amt;
        if (date >= new Date(boundaries.month.start) && date <= new Date(boundaries.month.end)) restaurantRevenue.month += amt;
        if (date >= new Date(boundaries.week.start) && date <= new Date(boundaries.week.end)) restaurantRevenue.week += amt;
        if (date >= new Date(boundaries.today.start) && date <= new Date(boundaries.today.end)) restaurantRevenue.today += amt;
    });

    // 3. Generate 30-Day Trend Data
    const thirtyDaysAgo = subDays(startOfDay(now), 29); // 30 days including today
    const trends: Record<string, TrendData> = {};

    // Initialize trend map
    for (let i = 0; i < 30; i++) {
        const d = subDays(now, 29 - i);
        const key = format(d, 'MMM dd');
        trends[key] = { date: key, hotelRevenue: 0, restaurantRevenue: 0, bookings: 0 };
    }

    // Populate Hotel Trends
    allBookings?.forEach(b => {
        const d = new Date(b.created_at);
        if (d >= thirtyDaysAgo) {
            const key = format(d, 'MMM dd');
            if (trends[key]) {
                trends[key].hotelRevenue += Number(b.total_bill || 0);
                trends[key].bookings += 1;
            }
        }
    });

    // Populate Restaurant Trends
    allOrders?.forEach(o => {
        const d = new Date(o.order_time);
        if (d >= thirtyDaysAgo) {
            const key = format(d, 'MMM dd');
            if (trends[key]) {
                trends[key].restaurantRevenue += Number(o.total_amount || 0);
            }
        }
    });

    return {
        hotelRevenue,
        restaurantRevenue,
        trends: Object.values(trends)
    };
}
