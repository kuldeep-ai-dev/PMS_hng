'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getMoneyReceiptsData() {
    const supabase = await createClient();

    // 1. Fetch all payments with booking and guest details
    const { data: payments, error } = await supabase
        .from('payments')
        .select(`
            *,
            bookings (
                id,
                total_bill,
                status,
                is_settled,
                check_in_date,
                guests (id, name, email),
                rooms (id, number),
                companies (id, name)
            )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[Receipts] Error fetching room payments:', error);
        throw error;
    }

    // 2. Fetch restaurant payments (Both direct and folio)
    const { data: restaurantPayments, error: posError } = await supabase
        .from('restaurant_orders')
        .select(`
            *,
            is_settled_with_restaurant,
            guests (id, name),
            rooms (id, number)
        `)
        .in('payment_status', ['paid', 'charged_to_room']) // Include both!
        .in('status', ['preparing', 'ready', 'served', 'completed'])
        .order('order_time', { ascending: false });

    if (posError) {
        console.error('[Receipts] Error fetching POS payments:', posError);
    }

    return {
        roomPayments: payments || [],
        posPayments: restaurantPayments || []
    };
}

export async function getReceiptStats() {
    const supabase = await createClient();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Total today (Room)
    const { data: todayRoom } = await supabase
        .from('payments')
        .select('amount')
        .gte('created_at', today.toISOString());

    // Total today (Restaurant - Both direct and folio)
    const { data: todayPOS } = await supabase
        .from('restaurant_orders')
        .select('total_amount, payment_status')
        .eq('is_refund', false)
        .in('payment_status', ['paid', 'charged_to_room'])
        .in('status', ['preparing', 'ready', 'served', 'completed'])
        .gte('order_time', today.toISOString());

    const roomTotal = todayRoom?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    // Split POS totals for granular reporting
    const posDirectTotal = todayPOS?.filter(p => p.payment_status === 'paid').reduce((sum, p) => sum + Number(p.total_amount), 0) || 0;
    const posFolioTotal = todayPOS?.filter(p => p.payment_status === 'charged_to_room').reduce((sum, p) => sum + Number(p.total_amount), 0) || 0;
    const posTotal = posDirectTotal + posFolioTotal;

    return {
        todayTotal: roomTotal + posTotal,
        roomCollection: roomTotal,
        posCollection: posTotal,
        posDirectTotal,
        posFolioTotal
    };
}

export async function processRefund(
    transactionId: string,
    type: 'Room Booking' | 'Restaurant POS',
    amount: number,
    reason: string,
    metadata?: any
) {
    const supabase = await createClient();

    if (type === 'Room Booking') {
        // Log a reverse transaction in the payments table
        const { error } = await supabase.from('payments').insert([{
            booking_id: metadata.bookingId,
            amount: -Math.abs(Number(amount)), // Ensure negative numerical value
            method: 'Cash', // Default to cash for refunds if not specified
            is_refund: true,
            refund_reason: reason,
            refund_original_id: transactionId
        }]);

        if (error) {
            console.error('[Refund] Error logging room refund:', error);
            return { success: false, message: error.message };
        }
    } else {
        // Handle POS refund
        const { error } = await supabase.from('restaurant_orders')
            .update({
                is_refund: true,
                refund_reason: reason
            })
            .eq('id', transactionId);

        if (error) {
            console.error('[Refund] Error logging POS refund:', error);
            return { success: false, message: error.message };
        }
    }

    revalidatePath('/operations/money-receipts');
    return { success: true };
}

export async function settlePOSWithRestaurant(orderId: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from('restaurant_orders')
        .update({ is_settled_with_restaurant: true })
        .eq('id', orderId);

    if (error) throw error;
    revalidatePath('/operations/money-receipts');
    return { success: true };
}
