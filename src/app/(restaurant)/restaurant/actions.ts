'use server';

import { createClient } from '@/utils/supabase/server';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';
import { revalidatePath } from 'next/cache';
import { getISTTodayRange, formatISTDate, getISTDate, formatISTShort } from '@/utils/date';

export async function getRestaurantInsights() {
    const supabase = await createClient();
    const { start: todayStart, end: todayEnd } = getISTTodayRange();
    const now = getISTDate();
    const sevenDaysAgo = new Date(new Date(todayStart).getTime() - 6 * 24 * 60 * 60 * 1000).toISOString();

    console.log('[Analytics] Fetching range:', todayStart, 'to', todayEnd);

    const businessDate = formatISTDate(new Date(), 'dashboard');

    try {
        // Parallel execution of all necessary data
        const [tablesRes, ordersRes, topItemsRes, recentOrdersRes, reservationsRes, waitersRes] = await Promise.all([
            supabase.from('restaurant_tables').select('status'),
            supabase.from('restaurant_orders')
                .select('total_amount, status, payment_status, order_time, waiter_id, waiter:profiles(name)')
                .gte('order_time', sevenDaysAgo)
                .lte('order_time', todayEnd),
            supabase.from('restaurant_order_items')
                .select('menu_item_id, quantity, item:restaurant_menu_items(name, category_id)')
                .gte('created_at', todayStart)
                .lte('created_at', todayEnd),
            supabase.from('restaurant_orders')
                .select('*, table:restaurant_tables(table_number), room:rooms(number), waiter:profiles(name)')
                .order('order_time', { ascending: false })
                .limit(10),
            supabase.from('restaurant_reservations')
                .select('*, table:restaurant_tables(table_number)')
                .gte('reservation_time', todayStart)
                .lte('reservation_time', todayEnd)
                .order('reservation_time', { ascending: true }),
            supabase.from('profiles')
                .select('id, name')
                .eq('role', 'restaurant_staff')
        ]);

        if (ordersRes.error) throw ordersRes.error;

        const reservations = reservationsRes.data || [];
        const waiters = waitersRes.data || [];

        // 1. Table Data for Floor Plan
        const tables = tablesRes.data || [];
        const { data: floorTablesRaw } = await supabase
            .from('restaurant_tables')
            .select('id, table_number, status, capacity, pos_x, pos_y, shape, rotation, width_px, height_px')
            .order('table_number');

        const floorTables = [...(floorTablesRaw || [])].sort((a, b) => {
            return a.table_number.localeCompare(b.table_number, undefined, { numeric: true, sensitivity: 'base' });
        });

        const { data: activeTableOrders } = await supabase
            .from('restaurant_orders')
            .select('table_id, status')
            .in('status', ['pending', 'preparing', 'ready', 'served', 'partial'])
            .not('table_id', 'is', null);

        const tablesWithOrderInfo = (floorTables || []).map(table => {
            const order = activeTableOrders?.find(o => o.table_id === table.id);
            let displayStatus = 'Vacant';
            if (order || table.status.toLowerCase() === 'occupied') displayStatus = 'Occupied';
            return { ...table, displayStatus };
        });

        // 2. Waiter Performance Calculation
        const allOrders = ordersRes.data || [];
        const waiterSalesMap = new Map();

        allOrders.forEach(o => {
            if (o.waiter_id && o.status === 'billed') {
                const waiterObj = Array.isArray(o.waiter) ? o.waiter[0] : o.waiter;
                const current = waiterSalesMap.get(o.waiter_id) || { name: waiterObj?.name || 'Unknown', total: 0, count: 0 };
                waiterSalesMap.set(o.waiter_id, {
                    ...current,
                    total: current.total + Number(o.total_amount || 0),
                    count: current.count + 1
                });
            }
        });

        const waiterPerformance = Array.from(waiterSalesMap.values())
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);

        // 3. Process Orders for stats
        const todayOrders = allOrders.filter(o => o.order_time >= todayStart && o.order_time <= todayEnd);
        const settledOrdersToday = todayOrders.filter(o => ['paid', 'charged_to_room'].includes(o.payment_status));

        const ordersCount = settledOrdersToday.length;
        const todayRevenue = settledOrdersToday.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
        const paidOrdersToday = settledOrdersToday.filter(o => o.payment_status === 'paid');
        const folioOrdersToday = settledOrdersToday.filter(o => o.payment_status === 'charged_to_room');
        const counterCollection = paidOrdersToday.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
        const roomChargesTotal = folioOrdersToday.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

        // 4. Chart Data Generation (Last 7 Days)
        const chartDataMap = new Map();
        for (let i = 6; i >= 0; i--) {
            const dateLabel = formatISTShort(subDays(now, i));
            chartDataMap.set(dateLabel, 0);
        }

        allOrders.forEach(order => {
            if (['paid', 'charged_to_room'].includes(order.payment_status)) {
                const dateLabel = formatISTShort(new Date(order.order_time));
                if (chartDataMap.has(dateLabel)) {
                    chartDataMap.set(dateLabel, chartDataMap.get(dateLabel) + Number(order.total_amount));
                }
            }
        });

        const chartData = Array.from(chartDataMap.entries()).map(([date, revenue]) => ({ date, revenue }));

        return {
            success: true,
            data: {
                tableOccupancy: Math.round((tablesWithOrderInfo.filter(t => t.displayStatus === 'Occupied').length / (tablesWithOrderInfo.length || 1)) * 100),
                todayRevenue,
                counterCollection,
                roomChargesTotal,
                ordersCount,
                chartData,
                businessDate,
                tables: tablesWithOrderInfo,
                topItems: topItemsRes.data || [],
                recentActivity: recentOrdersRes.data || [],
                todayReservations: reservations,
                waiterPerformance,
                waiters,
                debug: { todayStart, todayEnd, now: now.toISOString() }
            }
        };
    } catch (error: any) {
        console.error('getRestaurantInsights error:', error);
        return { success: false, error: error.message };
    }
}

export async function updateTablePosition(tableId: string, x: number, y: number) {
    const supabase = await createClient();
    try {
        const { error } = await supabase
            .from('restaurant_tables')
            .update({ pos_x: x, pos_y: y })
            .eq('id', tableId);
        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateTableProps(tableId: string, props: {
    shape?: 'square' | 'round',
    rotation?: number,
    width_px?: number,
    height_px?: number
}) {
    const supabase = await createClient();
    try {
        const { error } = await supabase
            .from('restaurant_tables')
            .update(props)
            .eq('id', tableId);
        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
