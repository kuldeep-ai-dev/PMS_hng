'use server';

import { createClient } from '@/utils/supabase/server';

export interface Notification {
    id: string;
    type: 'checkout_due' | 'pending_payment' | 'checkin_today';
    title: string;
    description: string;
    bookingId: string;
    createdAt: string;
}

export async function getNotifications(): Promise<Notification[]> {
    const supabase = await createClient();
    const today = new Date();
    const todayStart = new Date(today); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today); todayEnd.setHours(23, 59, 59, 999);

    const notifications: Notification[] = [];

    // 1. Check-outs due today
    const { data: checkouts } = await supabase
        .from('bookings')
        .select('id, check_out_date, guests(name), rooms(number), total_bill, advance_payment, payments(*)')
        .eq('status', 'Active')
        .gte('check_out_date', todayStart.toISOString())
        .lte('check_out_date', todayEnd.toISOString());

    checkouts?.forEach((b: any) => {
        const advancePaid = Number(b.advance_payment) || 0;
        const extraPaid = b.payments?.reduce((s: number, p: any) => s + Number(p.amount), 0) || 0;
        const totalPaid = advancePaid + extraPaid;
        const grandTotal = Number(b.total_bill) || 0;
        const balance = grandTotal - totalPaid;

        if (balance > 1) {
            notifications.push({
                id: `pending-${b.id}`,
                type: 'pending_payment',
                title: `Payment Pending`,
                description: `Room ${b.rooms?.number} · ${b.guests?.name} · ₹${balance.toLocaleString('en-IN')} due`,
                bookingId: b.id,
                createdAt: b.check_out_date,
            });
        } else {
            notifications.push({
                id: `checkout-${b.id}`,
                type: 'checkout_due',
                title: `Check-out Today`,
                description: `Room ${b.rooms?.number} · ${b.guests?.name}`,
                bookingId: b.id,
                createdAt: b.check_out_date,
            });
        }
    });

    // 2. Check-ins today
    const { data: checkins } = await supabase
        .from('bookings')
        .select('id, check_in_date, guests(name), rooms(number)')
        .eq('status', 'Active')
        .gte('check_in_date', todayStart.toISOString())
        .lte('check_in_date', todayEnd.toISOString());

    checkins?.forEach((b: any) => {
        notifications.push({
            id: `checkin-${b.id}`,
            type: 'checkin_today',
            title: `Check-in Today`,
            description: `Room ${b.rooms?.number} · ${b.guests?.name}`,
            bookingId: b.id,
            createdAt: b.check_in_date,
        });
    });

    return notifications;
}
