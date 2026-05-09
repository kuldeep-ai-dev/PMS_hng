'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getOrdersData() {
    const supabase = await createClient();
    try {
        const [
            { data: { user } },
            { data: orders },
            { data: tables },
            { data: loyaltySettings },
            { data: hotelSettings }
        ] = await Promise.all([
            supabase.auth.getUser(),
            supabase
                .from('restaurant_orders')
                .select(`
                    *,
                    table:restaurant_tables(table_number),
                    room:rooms(number),
                    guest:guests(name),
                    items:restaurant_order_items(
                        menu_item_id,
                        quantity, 
                        notes, 
                        price_at_time,
                        item:restaurant_menu_items(name, is_veg)
                    )
                `)
                .in('status', ['pending', 'preparing', 'ready', 'served', 'partial'])
                .not('order_source', 'in', '("pos_walkin","pos_room")')
                .order('order_time', { ascending: false }),
            supabase.from('restaurant_tables').select('*').order('table_number'),
            supabase.from('restaurant_loyalty_settings').select('*').limit(1).maybeSingle(),
            supabase.from('hotel_settings').select('*').limit(1).maybeSingle()
        ]);

        let userRole = null;
        if (user) {
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
            if (profile) userRole = profile.role;
        }

        return {
            success: true,
            data: {
                orders: (orders || []) as any,
                tables: (tables || []) as any,
                loyaltySettings,
                hotelSettings,
                userRole
            }
        };
    } catch (error: any) {
        console.error('Server Action Error (getOrdersData):', error);
        return { success: false, error: error.message };
    }
}

export async function updateOrderStatus(orderId: string, currentStatus: string) {
    const supabase = await createClient();
    const sequence = ['pending', 'preparing', 'served'];
    const nextIndex = sequence.indexOf(currentStatus) + 1;

    if (nextIndex >= sequence.length) return { success: false, error: 'Invalid status transition' };
    const nextStatus = sequence[nextIndex];

    try {
        // Handle Automatic Folio Billing for QR Room Orders when marking as Served
        if (nextStatus === 'served') {
            const { data: order } = await supabase
                .from('restaurant_orders')
                .select('*')
                .eq('id', orderId)
                .single();

            if (order && order.order_source === 'qr_room') {
                let bId = order.booking_id;

                // Fallback: If booking_id is missing, try to find the active booking for the room
                if (!bId && order.room_id) {
                    const { data: activeBooking } = await supabase
                        .from('bookings')
                        .select('id')
                        .eq('room_id', order.room_id)
                        .eq('status', 'Active')
                        .maybeSingle();
                    if (activeBooking) bId = activeBooking.id;
                }

                if (bId) {
                    // Update the order with the booking_id if it was missing
                    if (!order.booking_id) {
                        await supabase.from('restaurant_orders').update({ booking_id: bId }).eq('id', orderId);
                    }

                    // Automate the billing via the existing finalizeRestaurantBill function
                    const billResult = await finalizeRestaurantBill(orderId, {
                        payment_mode: 'Folio',
                        redeem_points: 0,
                        discount_amount: 0
                    });

                    if (billResult.success) {
                        return { success: true, nextStatus: 'billed', bill_no: billResult.bill_no };
                    }
                }
            }
        }

        let updateData: any = {
            status: nextStatus,
            updated_at: new Date().toISOString()
        };

        // When accepting a pending order, assign a KOT number
        if (currentStatus === 'pending' && nextStatus === 'preparing') {
            const { data: kotReal, error: kotError } = await supabase.rpc('get_next_restaurant_kot_no');
            if (kotError) throw kotError;
            updateData.kot_no = kotReal;
        }

        const { error } = await supabase
            .from('restaurant_orders')
            .update(updateData)
            .eq('id', orderId);

        if (error) throw error;

        revalidatePath('/restaurant/orders');
        return { success: true, nextStatus, kot_no: updateData.kot_no };
    } catch (error: any) {
        console.error('Server Action Error (updateOrderStatus):', error);
        return { success: false, error: error.message };
    }
}

export async function finalizeRestaurantBill(orderId: string, payload: {
    payment_mode: string;
    redeem_points: number;
    discount_amount: number;
    customer_mobile?: string;
    customer_name?: string;
}) {
    const supabase = await createClient();

    try {
        // 1. Get the order details to find booking_id if payment is Folio
        const { data: order } = await supabase
            .from('restaurant_orders')
            .select('*')
            .eq('id', orderId)
            .single();

        if (!order) throw new Error('Order not found');

        // 2. Generate Bill Number if not already assigned
        let billNo = order.bill_no;
        if (!billNo) {
            const { data: nextBillNo, error: billError } = await supabase.rpc('get_next_restaurant_bill_no');
            if (billError) throw billError;
            billNo = nextBillNo;
        }

        // 3. Update Order
        const { error: orderError } = await supabase
            .from('restaurant_orders')
            .update({
                status: 'billed',
                bill_no: billNo,
                payment_status: payload.payment_mode === 'Folio' ? 'charged_to_room' : 'paid',
                payment_mode: payload.payment_mode,
                customer_name: payload.customer_name || order.customer_name,
                customer_mobile: payload.customer_mobile || order.customer_mobile,
                loyalty_points_redeemed: payload.redeem_points,
                loyalty_discount_amount: payload.discount_amount,
                updated_at: new Date().toISOString()
            })
            .eq('id', orderId);

        if (orderError) throw orderError;

        // 3. Handle 'Bill to Folio'
        if (payload.payment_mode === 'Folio' && order.booking_id) {
            const billAmount = order.total_amount - payload.discount_amount;

            // Add to Extra Charges
            const { error: chargeError } = await supabase
                .from('extra_charges')
                .insert([{
                    booking_id: order.booking_id,
                    description: `Restaurant Order #${billNo || order.kot_no || 'POS'}`,
                    amount: billAmount
                }]);

            if (chargeError) throw chargeError;

            // Update Booking Total
            const { data: booking } = await supabase
                .from('bookings')
                .select('total_bill')
                .eq('id', order.booking_id)
                .single();

            if (booking) {
                await supabase
                    .from('bookings')
                    .update({ total_bill: (booking.total_bill || 0) + billAmount })
                    .eq('id', order.booking_id);
            }
        }

        // 4. Update/Upsert Customer for Marketing Leads
        if (payload.customer_mobile && payload.customer_mobile.length >= 10) {
            await supabase
                .from('restaurant_customers')
                .upsert([{
                    mobile_number: payload.customer_mobile,
                    name: payload.customer_name || order.customer_name || 'Walk-in Guest',
                    updated_at: new Date().toISOString()
                }], { onConflict: 'mobile_number' });

            // Also ensure loyalty wallet exists
            await supabase
                .from('restaurant_loyalty_wallets')
                .upsert([
                    { mobile_number: payload.customer_mobile }
                ], { onConflict: 'mobile_number' });
        }

        // 5. Handle Loyalty if points redeemed
        if (payload.redeem_points > 0 && payload.customer_mobile) {
            const { data: wallet } = await supabase
                .from('restaurant_loyalty_wallets')
                .select('points_balance')
                .eq('mobile_number', payload.customer_mobile)
                .single();

            if (wallet) {
                await supabase
                    .from('restaurant_loyalty_wallets')
                    .update({ points_balance: wallet.points_balance - payload.redeem_points })
                    .eq('mobile_number', payload.customer_mobile);

                await supabase
                    .from('restaurant_loyalty_transactions')
                    .insert([{
                        mobile_number: payload.customer_mobile,
                        order_id: orderId,
                        points_delta: -payload.redeem_points,
                        transaction_type: 'redeem',
                        description: 'Points redeemed at Order Board'
                    }]);
            }
        }

        revalidatePath('/restaurant/orders');
        return { success: true, bill_no: billNo };
    } catch (error: any) {
        console.error('Server Action Error (finalizeRestaurantBill):', error);
        return { success: false, error: error.message };
    }
}
