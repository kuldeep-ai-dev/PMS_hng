'use server';

import { createClient } from '@/utils/supabase/server';
import { getISTTodayRange } from '@/utils/date-utils';

export async function getOrderHistory(filters?: {
    startDate?: string;
    endDate?: string;
    searchQuery?: string;
}) {
    const supabase = await createClient();

    let query = supabase
        .from('restaurant_orders')
        .select(`
            *,
            table:restaurant_tables(table_number),
            room:rooms(number),
            guest:guests(name),
            items:restaurant_order_items(
                quantity,
                price_at_time,
                item:restaurant_menu_items(name)
            )
        `)
        .order('order_time', { ascending: false });

    if (filters?.startDate) {
        query = query.gte('order_time', filters.startDate);
    }
    if (filters?.endDate) {
        query = query.lte('order_time', filters.endDate);
    }
    if (filters?.searchQuery) {
        // Search by Bill No or Customer Name
        if (!isNaN(Number(filters.searchQuery))) {
            query = query.eq('bill_no', Number(filters.searchQuery));
        } else {
            query = query.ilike('customer_name', `%${filters.searchQuery}%`);
        }
    }

    const { data, error } = await query.limit(50);

    if (error) {
        console.error('[Order History] Fetch Error:', error);
        throw error;
    }

    return data || [];
}
