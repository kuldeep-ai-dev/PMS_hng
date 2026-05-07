'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { getISTTodayRange } from '@/utils/date';

export async function getMoneyReceiptsData(startDate?: string, endDate?: string) {
    const supabase = await createClient();

    let query = supabase
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
        `);

    if (startDate) {
        query = query.gte('created_at', startDate);
    }
    if (endDate) {
        query = query.lte('created_at', endDate + 'T23:59:59.999+05:30');
    }

    const { data: payments, error } = await query.order('created_at', { ascending: false });

    if (error) {
        console.error('[Receipts] Error fetching room payments:', error);
        throw error;
    }

    // 2. Fetch restaurant payments (Both direct and folio)
    let posQuery = supabase
        .from('restaurant_orders')
        .select(`
            *,
            is_settled_with_restaurant,
            guests (id, name),
            rooms (id, number),
            table:restaurant_tables (table_number)
        `)
        .in('payment_status', ['paid', 'charged_to_room'])
        .in('status', ['preparing', 'ready', 'served', 'completed']);

    if (startDate) {
        posQuery = posQuery.gte('order_time', startDate);
    }
    if (endDate) {
        posQuery = posQuery.lte('order_time', endDate + 'T23:59:59.999+05:30');
    }

    const { data: restaurantPayments, error: posError } = await posQuery.order('order_time', { ascending: false });

    if (posError) {
        console.error('[Receipts] Error fetching POS payments:', posError);
    }

    return {
        roomPayments: payments || [],
        posPayments: restaurantPayments || []
    };
}

export async function getReceiptStats(startDate?: string, endDate?: string) {
    const supabase = await createClient();

    const { start: todayStart, end: todayEnd } = getISTTodayRange();

    const filterStart = startDate ? new Date(`${startDate}T00:00:00.000+05:30`).toISOString() : todayStart;
    const filterEnd = endDate ? new Date(`${endDate}T23:59:59.999+05:30`).toISOString() : todayEnd;

    // Total in range (Room)
    const { data: todayRoom } = await supabase
        .from('payments')
        .select('amount')
        .gte('created_at', filterStart)
        .lte('created_at', filterEnd);

    // Total in range (Restaurant - Both direct and folio)
    const { data: todayPOS } = await supabase
        .from('restaurant_orders')
        .select('total_amount, payment_status')
        .eq('is_refund', false)
        .in('payment_status', ['paid', 'charged_to_room'])
        .in('status', ['preparing', 'ready', 'served', 'completed'])
        .gte('order_time', filterStart)
        .lte('order_time', filterEnd);

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

import * as crypto from 'crypto';
import { sendAccountsPortalEmail } from '@/app/actions/mail';
import { getSettings } from '@/app/(dashboard)/settings/actions';

export async function generateAndSendAccountsLink(startDate: string, endDate: string) {
    try {
        const settings = await getSettings();

        if (!settings.accountant_email) {
            return { success: false, message: 'Accountant email is not configured in settings.' };
        }

        // Generate a secure JWT-like token without requiring DB schema changes
        const payload = JSON.stringify({ startDate, endDate, iat: Date.now() });
        const b64Payload = Buffer.from(payload).toString('base64url');
        const secret = process.env.INTERNAL_PDF_TOKEN || '__geny_pms_internal_pdf_2026__';
        const signature = crypto.createHmac('sha256', secret).update(b64Payload).digest('base64url');

        // Dynamically determine the application URL from headers if NEXT_PUBLIC_APP_URL is missing
        const headerList = await headers();
        const host = headerList.get('host');
        const proto = headerList.get('x-forwarded-proto') || 'http';
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`;

        // Use separate query params for payload and signature to avoid URL parsing issues with dots in emails
        const link = `${appUrl}/accounts-portal/view?p=${b64Payload}&s=${signature}`;

        const result = await sendAccountsPortalEmail(
            startDate,
            endDate,
            link,
            settings.accountant_email,
            settings.accountant_name || 'Accountant'
        );

        if (!result.success) throw new Error(result.error);

        return { success: true, message: 'Accounts portal link sent successfully to ' + settings.accountant_email };
    } catch (err: any) {
        console.error('Error generating accounts link:', err);
        return { success: false, message: err.message || 'Failed to send accounts link' };
    }
}
