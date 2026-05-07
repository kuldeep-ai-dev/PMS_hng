'use server';

import { createClient } from '@/utils/supabase/server';

export async function getRestaurantCustomerList() {
    const supabase = await createClient();

    // Fetch customers with their orders and items
    // We only want customers who have at least one direct POS order (booking_id is null)
    const { data, error } = await supabase
        .from('restaurant_customers')
        .select(`
            id,
            name,
            mobile_number,
            created_at,
            restaurant_orders (
                id,
                order_time,
                booking_id,
                room_id,
                restaurant_order_items (
                    quantity,
                    restaurant_menu_items (
                        is_veg
                    )
                )
            )
        `);

    if (error) {
        console.error('Error fetching customers:', error);
        return [];
    }

    // Process data to aggregate visits and preferences for DIRECT POS ONLY
    return (data || [])
        .map(customer => {
            // Count all restaurant orders for this customer
            const allOrders = customer.restaurant_orders || [];

            if (allOrders.length === 0) return null; // No orders, no lead

            const visitCount = allOrders.length;
            const lastVisitDate = allOrders.length > 0
                ? new Date(Math.max(...allOrders.map((o: any) => new Date(o.order_time).getTime())))
                : null;

            let vegCount = 0;
            let nonVegCount = 0;

            allOrders.forEach((order: any) => {
                order.restaurant_order_items?.forEach((item: any) => {
                    const isVeg = item.restaurant_menu_items?.is_veg;
                    const qty = item.quantity || 0;
                    if (isVeg === true) vegCount += qty;
                    else if (isVeg === false) nonVegCount += qty;
                });
            });

            const mealPreference = vegCount > nonVegCount ? 'Vegetarian' : (nonVegCount > 0 ? 'Non-Vegetarian' : 'Veg Preference');

            return {
                id: customer.id,
                name: customer.name,
                phone: customer.mobile_number,
                visitCount,
                lastVisit: lastVisitDate,
                mealPreference,
                totalItemsOrdered: vegCount + nonVegCount,
                joinedAt: customer.created_at
            };
        })
        .filter(Boolean)
        .sort((a: any, b: any) => (b.visitCount - a.visitCount));
}

export async function getRestaurantCustomerStats() {
    const customers = await getRestaurantCustomerList();

    const total = customers.length;
    const vegPrefCount = customers.filter((c: any) => c.mealPreference === 'Vegetarian').length;
    const nonVegPrefCount = customers.filter((c: any) => c.mealPreference === 'Non-Vegetarian').length;

    // Sort by visit count and get top visitor
    const topCustomer = [...customers].sort((a: any, b: any) => b.visitCount - a.visitCount)[0];

    return {
        total,
        vegPrefCount,
        nonVegPrefCount,
        topVisitorName: topCustomer?.name || 'N/A',
        topVisitorCount: topCustomer?.visitCount || 0
    };
}
