'use server';

import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// Initialize Service Role client to completely bypass RLS
const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function blockRoom(roomId: string, blockReason: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error: updateErr } = await supabaseAdmin.from('rooms')
        .update({ status: 'Blocked', blocked_reason: blockReason })
        .eq('id', roomId);

    if (updateErr) throw updateErr;

    const { error: logErr } = await supabaseAdmin.from('room_blocks').insert({
        room_id: roomId,
        manager_id: user?.id,
        block_reason: blockReason
    });

    if (logErr) throw logErr;

    revalidatePath('/', 'layout');
}

export async function unblockRoom(roomId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error: updateErr } = await supabaseAdmin.from('rooms')
        .update({ status: 'Available', blocked_reason: null })
        .eq('id', roomId);

    if (updateErr) throw updateErr;

    await supabaseAdmin.from('room_blocks').update({
        unblocked_at: new Date().toISOString(),
        unblocked_by: user?.id
    }).eq('room_id', roomId).is('unblocked_at', null);

    revalidatePath('/', 'layout');
}

export async function getRoomGridData() {
    const supabase = await createClient();

    const { data: rooms, error } = await supabase
        .from('rooms')
        .select(`
            id,
            number,
            type,
            status,
            blocked_reason,
            bookings (
                id,
                status,
                pax_count,
                check_in_date,
                check_out_date,
                food_plan,
                booking_source,
                guests (name, id_image_url),
                companies (name)
            ),
            cleaning_assignments (
                id,
                status,
                profiles (name)
            )
        `)
        .order('number', { ascending: true })
        .order('assigned_at', { foreignTable: 'cleaning_assignments', ascending: false });

    if (error) throw error;

    const formattedRooms = (rooms || []).map(room => {
        const activeBooking = room.bookings?.find((b: any) => b.status === 'Active');
        const activeAssignment = room.cleaning_assignments?.find((a: any) => a.status !== 'completed');

        return {
            id: room.id,
            number: room.number,
            type: room.type,
            status: room.status,
            guestName: (activeBooking?.guests as any)?.name,
            bookingId: activeBooking?.id,
            paxCount: activeBooking?.pax_count,
            checkOutDate: activeBooking?.check_out_date,
            idPending: room.status === 'Occupied' && !(activeBooking?.guests as any)?.id_image_url,
            assignedStaffName: (activeAssignment?.profiles as any)?.name,
            assignmentId: activeAssignment?.id,
            blockedReason: room.blocked_reason,
            foodPlan: activeBooking?.food_plan,
            bookingSource: activeBooking?.booking_source
        };
    });

    return formattedRooms;
}

export async function getRooms() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('rooms')
        .select('id, number')
        .order('number', { ascending: true });

    if (error) throw error;
    return data;
}
