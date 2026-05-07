'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { getISTTodayRange } from '@/utils/date-utils';

export async function getRestaurantMoneyReceiptsData() {
    const supabase = await createClient();

    // Fetch all restaurant orders with guest and room details
    // Include both 'paid' (POS) and 'charged_to_room' (Folio)
    const { data: restaurantPayments, error } = await supabase
        .from('restaurant_orders')
        .select(`
            *,
            guests (id, name),
            rooms (id, number),
            bookings (id, check_in_date),
            restaurant_customers (id, name),
            table:restaurant_tables (table_number)
        `)
        .in('payment_status', ['paid', 'charged_to_room'])
        .eq('is_refund', false)
        .order('order_time', { ascending: false });

    if (error) {
        console.error('[Restaurant Receipts] Error fetching orders:', error);
        throw error;
    }

    return {
        posPayments: restaurantPayments || []
    };
}

export async function getRestaurantReceiptStats() {
    const supabase = await createClient();
    const { start: todayStart, end: todayEnd } = getISTTodayRange();

    const { data: todayOrders, error } = await supabase
        .from('restaurant_orders')
        .select('total_amount, payment_status, is_refund')
        .gte('order_time', todayStart)
        .lte('order_time', todayEnd)
        .in('payment_status', ['paid', 'charged_to_room']);

    if (error) throw error;

    const stats = {
        todayTotal: 0,
        posCollection: 0,
        folioCollection: 0,
        orderCount: todayOrders?.length || 0
    };

    todayOrders?.forEach(order => {
        const amount = Number(order.total_amount || 0);
        if (!order.is_refund) {
            stats.todayTotal += amount;
            if (order.payment_status === 'paid') {
                stats.posCollection += amount;
            } else if (order.payment_status === 'charged_to_room') {
                stats.folioCollection += amount;
            }
        }
    });

    return stats;
}

export async function processRestaurantRefund(
    orderId: string,
    amount: number,
    reason: string
) {
    const supabase = await createClient();

    const { error } = await supabase.from('restaurant_orders')
        .update({
            is_refund: true,
            refund_reason: reason
        })
        .eq('id', orderId);

    if (error) {
        console.error('[Restaurant Refund] Error:', error);
        return { success: false, message: error.message };
    }

    revalidatePath('/restaurant/money-receipts');
    return { success: true };
}

export async function settleRestaurantOrder(orderId: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from('restaurant_orders')
        .update({ is_settled_with_restaurant: true })
        .eq('id', orderId);

    if (error) throw error;
    revalidatePath('/restaurant/money-receipts');
    return { success: true };
}
