'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import { getISTTodayRange, getTodayIST, getISTDate, formatISTShort } from '@/utils/date';
import { startOfDay, subDays, eachDayOfInterval } from 'date-fns';

export async function getAdminDashboardStats() {
    const supabase = createAdminClient();
    const { start: todayStart, end: todayEnd } = getISTTodayRange();
    const todayIST = getTodayIST();
    // Use getISTDate to handle the rolling window relative to India
    const weekStart = subDays(getISTDate(), 7).toISOString();

    // Parallel fetching for performance
    const [
        { data: todayPayments },
        { data: todayRestOrders },
        { data: todayRefunds },
        { data: attendance },
        { data: rooms },
        { data: weekPayments },
        { data: weekRestOrders },
        { data: profiles }
    ] = await Promise.all([
        supabase.from('payments').select('amount, method').gte('created_at', todayStart).lt('created_at', todayEnd).eq('is_refund', false),
        supabase.from('restaurant_orders').select('total_amount').gte('order_time', todayStart).lt('order_time', todayEnd).in('payment_status', ['paid', 'charged_to_room']).eq('is_refund', false),
        supabase.from('payments').select('amount').gte('created_at', todayStart).lt('created_at', todayEnd).eq('is_refund', true),
        supabase.from('staff_attendance').select('*, profiles(name, role, photo_url)').eq('date', todayIST),
        supabase.from('rooms').select('status'),
        supabase.from('payments').select('created_at, amount').gte('created_at', weekStart).eq('is_refund', false),
        supabase.from('restaurant_orders').select('order_time, total_amount').gte('order_time', weekStart).in('payment_status', ['paid', 'charged_to_room']).eq('is_refund', false),
        supabase.from('profiles').select('id', { count: 'exact', head: true })
    ]);

    // 1. Revenue Calculations
    const roomRevenue = todayPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    const restRevenue = todayRestOrders?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;
    const totalTodayRevenue = roomRevenue + restRevenue;
    const totalTodayLoss = todayRefunds?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    // 2. Attendance Stats
    const totalStaff = profiles?.length || 0;
    const presentStaff = attendance?.length || 0;
    const attendanceRate = totalStaff > 0 ? Math.round((presentStaff / totalStaff) * 100) : 0;

    // 3. Occupancy Stats
    const totalRooms = rooms?.length || 0;
    const occupiedRooms = rooms?.filter(r => r.status === 'Occupied').length || 0;
    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    // 4. Chart Data (Last 7 Days)
    const chartDataMap = new Map<string, number>();
    const interval = eachDayOfInterval({
        start: subDays(getISTDate(), 6),
        end: getISTDate()
    });

    interval.forEach(day => {
        chartDataMap.set(formatISTShort(day), 0);
    });

    weekPayments?.forEach(p => {
        const d = formatISTShort(p.created_at);
        if (chartDataMap.has(d)) chartDataMap.set(d, chartDataMap.get(d)! + Number(p.amount));
    });

    weekRestOrders?.forEach(o => {
        const d = formatISTShort(o.order_time);
        if (chartDataMap.has(d)) chartDataMap.set(d, chartDataMap.get(d)! + Number(o.total_amount));
    });

    const revenueChartData = Array.from(chartDataMap.entries()).map(([date, amount]) => ({
        date,
        revenue: amount
    }));

    return {
        todayRevenue: totalTodayRevenue,
        roomRevenue,
        restRevenue,
        todayLoss: totalTodayLoss,
        presentStaff,
        attendanceRate,
        occupancyRate,
        totalRooms,
        occupiedRooms,
        revenueChartData,
        attendanceDetails: attendance || []
    };
}
