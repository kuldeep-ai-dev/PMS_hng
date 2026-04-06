'use client';

import { createClient } from '@/utils/supabase/client';

export async function getActiveFolios() {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('bookings')
        .select(`
            id,
            rooms (number),
            guests (name)
        `)
        .eq('status', 'Active');

    if (error) throw error;
    return data || [];
}

export async function postRestaurantOrder(orderData: any) {
    const supabase = createClient();

    const orderItems = orderData.items.map((item: any) => ({
        booking_id: orderData.booking_id,
        item_name: item.name,
        quantity: item.qty || 1,
        price: item.price
    }));

    const { data: order, error } = await supabase
        .from('restaurant_orders')
        .insert(orderItems)
        .select();

    if (error) throw error;
    return order;
}
