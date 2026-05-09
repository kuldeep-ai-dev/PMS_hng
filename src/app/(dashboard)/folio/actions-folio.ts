'use server';

import { createClient } from '@/utils/supabase/server';
import { getSettings } from '@/app/(dashboard)/settings/actions';
import { revalidatePath } from 'next/cache';
import { getAvailableCleaningStaff, assignCleaningStaff } from '@/app/actions/housekeeping';
import { sendCheckoutMail } from '@/app/actions/mail';
import { getISTNow, getISTDate } from '@/utils/date';

export async function getBookingFolio(bookingId: string) {
    try {
        const supabase = await createClient();

        const { data: booking, error } = await supabase
            .from('bookings')
            .select(`
                *,
                guests (*),
                rooms (*),
                payments (*),
                companies (*)
            `)
            .eq('id', bookingId)
            .single();

        if (error) throw error;
        return { success: true, data: booking, error: null };
    } catch (err: any) {
        console.error('[Folio] getBookingFolio error:', err);
        return { success: false, data: null, error: err.message || 'Failed to fetch booking folio' };
    }
}

export async function logPayment(bookingId: string, amount: number, method: string) {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('payments')
            .insert([{
                booking_id: bookingId,
                amount: amount,
                method: method
            }])
            .select();

        if (error) throw error;
        revalidatePath(`/folio/${bookingId}`);
        revalidatePath('/');
        return { success: true, data: data?.[0], error: null };
    } catch (err: any) {
        console.error('[Folio] logPayment error:', err);
        return { success: false, data: null, error: err.message || 'Failed to log payment' };
    }
}

export async function getRestaurantCharges(bookingId: string) {
    try {
        const supabase = await createClient();

        // Fetch orders tied to this specific booking
        // OR orders for this guest/room within the booking dates (for legacy support)
        const { data: booking } = await supabase
            .from('bookings')
            .select('guest_id, room_id, check_in_date')
            .eq('id', bookingId)
            .single();

        if (!booking) return { success: true, data: [] };

        const { data, error } = await supabase
            .from('restaurant_orders')
            .select(`
                *,
                restaurant_order_items (
                    id, quantity, price_at_time,
                    restaurant_menu_items (name)
                )
            `)
            .or(`booking_id.eq.${bookingId},and(guest_id.eq.${booking.guest_id},room_id.eq.${booking.room_id},order_time.gte.${booking.check_in_date})`)
            .eq('payment_status', 'charged_to_room')
            .order('order_time', { ascending: false });

        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (err: any) {
        console.error('[Folio] getRestaurantCharges error:', err);
        return { success: false, error: err.message || 'Failed to fetch restaurant charges' };
    }
}

export async function extendStay(bookingId: string, additionalNights: number) {
    try {
        const supabase = await createClient();

        // 1. Fetch current booking
        const { data: booking, error: fetchErr } = await supabase
            .from('bookings')
            .select('check_out_date')
            .eq('id', bookingId)
            .single();

        if (fetchErr) throw fetchErr;

        // 2. Calculate new check-out date
        const nowIST = getISTNow();
        const dbCheckout = new Date(booking.check_out_date);

        // If the scheduled checkout has passed, start extension from now
        const currentCheckout = (dbCheckout < nowIST) ? nowIST : dbCheckout;
        currentCheckout.setDate(currentCheckout.getDate() + additionalNights);

        // 3. Update booking
        const { error: updateErr } = await supabase
            .from('bookings')
            .update({ check_out_date: currentCheckout.toISOString() })
            .eq('id', bookingId);

        if (updateErr) throw updateErr;
        revalidatePath(`/folio/${bookingId}`);
        revalidatePath('/');
        return { success: true, newCheckoutDate: currentCheckout.toISOString(), error: null };
    } catch (err: any) {
        console.error('[Folio] extendStay error:', err);
        return { success: false, error: err.message || 'Failed to extend stay' };
    }
}

export async function performCheckout(bookingId: string, roomId: string, billToCompany: boolean = false, devOrigin?: string) {
    try {
        const supabase = await createClient();

        // 1. Update booking status and billing preference
        const { error: bookErr } = await supabase
            .from('bookings')
            .update({
                status: 'Checked_Out',
                check_out_date: new Date().toISOString(),
                bill_to_company: billToCompany
            })
            .eq('id', bookingId);

        if (bookErr) throw bookErr;

        // 1b. Trigger Emails & WhatsApp (Awaited to ensure completion)
        try {
            console.log('[Checkout] sending notifications for:', bookingId, 'with origin:', devOrigin);
            await sendCheckoutMail(bookingId, devOrigin);
        } catch (e) {
            console.error('[Checkout Notifications Failed]:', e);
        }

        // 2. Set room to Dirty (needs housekeeping)
        const { error: roomErr } = await supabase
            .from('rooms')
            .update({ status: 'Dirty' })
            .eq('id', roomId);

        if (roomErr) throw roomErr;

        revalidatePath('/front-desk');
        revalidatePath('/rooms');
        revalidatePath(`/folio/${bookingId}`);
        revalidatePath('/');

        return { success: true };
    } catch (err: any) {
        console.error('[Folio] performCheckout error:', err);
        return { success: false, error: err.message || 'Failed to perform checkout' };
    }
}

export async function updateRefundPolicy(bookingId: string, allowRefund: boolean) {
    try {
        const supabase = await createClient();
        const { error } = await supabase
            .from('bookings')
            .update({ allow_early_checkout_refund: allowRefund })
            .eq('id', bookingId);
        if (error) throw error;
        revalidatePath(`/folio/${bookingId}`);
        return { success: true, error: null };
    } catch (err: any) {
        console.error('[Folio] updateRefundPolicy error:', err);
        return { success: false, error: err.message || 'Failed to update refund policy' };
    }
}

export async function updateGuestIdUrl(guestId: string, idUrl: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from('guests')
        .update({ id_image_url: idUrl })
        .eq('id', guestId);
    if (error) throw error;
}

// ─── Room Transfer ───────────────────────────────────────
export async function transferRoom(
    bookingId: string,
    fromRoomId: string,
    toRoomId: string,
    reason: string
) {
    try {
        const supabase = await createClient();

        // 1. Fetch current booking and the last transfer to calculate nights spent in current segment
        const { data: booking, error: bErr } = await supabase
            .from('bookings')
            .select('check_in_date, room_id')
            .eq('id', bookingId)
            .single();
        if (bErr) throw bErr;

        const { data: lastTransfer } = await supabase
            .from('room_transfers')
            .select('transferred_at')
            .eq('booking_id', bookingId)
            .order('transferred_at', { ascending: false })
            .limit(1)
            .single();

        const segmentStartDate = lastTransfer ? new Date(lastTransfer.transferred_at) : new Date(booking.check_in_date);
        const nightsInOldRoom = Math.max(1, Math.ceil(
            (getISTNow().getTime() - segmentStartDate.getTime()) / (1000 * 60 * 60 * 24)
        ));
        const { data: fromRoom } = await supabase.from('rooms').select('number, base_rate, status').eq('id', fromRoomId).single();
        const { data: toRoom } = await supabase.from('rooms').select('number, base_rate, status').eq('id', toRoomId).single();

        if (!fromRoom || !toRoom) throw new Error('One or both rooms not found');
        if (toRoom.status !== 'Available') throw new Error(`Room ${toRoom.number} is not available (current status: ${toRoom.status})`);

        // 3. Update booking to new room
        const { error: updateErr } = await supabase
            .from('bookings')
            .update({ room_id: toRoomId })
            .eq('id', bookingId);
        if (updateErr) throw updateErr;

        // 4. Set old room → Dirty, new room → Occupied
        await supabase.from('rooms').update({ status: 'Dirty' }).eq('id', fromRoomId);
        await supabase.from('rooms').update({ status: 'Occupied' }).eq('id', toRoomId);

        // 5. Log the transfer
        const { error: logErr } = await supabase
            .from('room_transfers')
            .insert({
                booking_id: bookingId,
                from_room_id: fromRoomId,
                to_room_id: toRoomId,
                from_room_number: fromRoom.number,
                to_room_number: toRoom.number,
                from_rate: fromRoom.base_rate,
                to_rate: toRoom.base_rate,
                nights_in_old_room: nightsInOldRoom,
                reason: reason || 'No reason provided'
            });
        if (logErr) throw logErr;

        // 6. Auto-Assign Cleaning Staff for old room
        const cleaners = await getAvailableCleaningStaff();

        if (cleaners && cleaners.length > 0) {
            const assignedCleaner = cleaners[Math.floor(Math.random() * cleaners.length)];
            await supabase.from('cleaning_assignments').insert({
                room_id: fromRoomId,
                staff_id: assignedCleaner.id,
                status: 'pending',
                assigned_at: new Date().toISOString()
            });
        }

        revalidatePath('/front-desk');
        revalidatePath('/rooms');
        revalidatePath(`/folio/${bookingId}`);
        revalidatePath('/', 'layout');

        return { success: true, newRoomNumber: toRoom.number, error: null };
    } catch (err: any) {
        console.error('[Folio] transferRoom error:', err);
        return { success: false, error: err.message || 'Failed to transfer room' };
    }
}

export async function getRoomTransfers(bookingId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('room_transfers')
        .select('*')
        .eq('booking_id', bookingId)
        .order('transferred_at', { ascending: true });
    if (error) throw error;
    return data || [];
}

// ─── Extra Charges (Laundry, etc.) ───────────────────────
export async function getExtraCharges(bookingId: string) {
    const supabase = await createClient();
    try {
        const { data, error } = await supabase
            .from('extra_charges')
            .select('*')
            .eq('booking_id', bookingId)
            .order('created_at', { ascending: true });

        if (error) {
            if (error.code === '42P01') return []; // Table doesn't exist yet
            throw error;
        }
        return data || [];
    } catch (err) {
        console.error('Error fetching extra charges:', err);
        return [];
    }
}

export async function addExtraCharge(bookingId: string, description: string, amount: number) {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('extra_charges')
            .insert({
                booking_id: bookingId,
                description,
                amount: Number(amount)
            })
            .select()
            .single();

        if (error) throw error;
        revalidatePath(`/folio/${bookingId}`);
        return { success: true, data, error: null };
    } catch (err: any) {
        console.error('[Folio] addExtraCharge error:', err);
        return { success: false, error: err.message || 'Failed to add extra charge' };
    }
}

export async function deleteExtraCharge(chargeId: string, bookingId: string) {
    try {
        const supabase = await createClient();
        const { error } = await supabase
            .from('extra_charges')
            .delete()
            .eq('id', chargeId);

        if (error) throw error;
        revalidatePath(`/folio/${bookingId}`);
        return { success: true, error: null };
    } catch (err: any) {
        console.error('[Folio] deleteExtraCharge error:', err);
        return { success: false, error: err.message || 'Failed to delete extra charge' };
    }
}
export async function updateStayConfiguration(
    bookingId: string,
    data: {
        pax_count?: number;
        extra_beds?: number;
        food_plan?: string;
    }
) {
    const supabase = await createClient();
    const { error } = await supabase
        .from('bookings')
        .update(data)
        .eq('id', bookingId);

    if (error) throw error;
    revalidatePath(`/folio/${bookingId}`);
    return { success: true };
} export async function transferFolioBalance(
    sourceBookingId: string,
    sourceRoomNo: string,
    destBookingId: string,
    destRoomNo: string,
    amount: number
) {
    try {
        const supabase = await createClient();

        // 1. Credit Source Room (Clear Balance)
        const { error: paymentError } = await supabase
            .from('payments')
            .insert({
                booking_id: sourceBookingId,
                amount: amount,
                method: 'Bill Transfer',
                is_refund: false
            });

        if (paymentError) throw paymentError;

        // 2. Debit Destination Room (Add Charge)
        const { error: chargeError } = await supabase
            .from('extra_charges')
            .insert({
                booking_id: destBookingId,
                amount: amount,
                description: `Transferred Bill from Room ${sourceRoomNo}`
            });

        if (chargeError) throw chargeError;

        revalidatePath(`/folio/${sourceBookingId}`);
        revalidatePath(`/folio/${destBookingId}`);
        return { success: true, error: null };
    } catch (err: any) {
        console.error('[Folio] transferFolioBalance error:', err);
        return { success: false, error: err.message || 'Failed to transfer balance' };
    }
}

export async function getActiveBookings(excludeId: string) {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('bookings')
            .select(`
                id,
                pax_count,
                food_plan,
                guests (name),
                rooms (number, type)
            `)
            .eq('status', 'Active')
            .neq('id', excludeId);

        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (err: any) {
        console.error('[Folio] getActiveBookings error:', err);
        return { success: false, error: err.message || 'Failed to fetch active bookings' };
    }
}
