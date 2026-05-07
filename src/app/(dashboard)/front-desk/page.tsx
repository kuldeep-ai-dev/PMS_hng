import { createClient } from '@/utils/supabase/server';
import { RoomGrid } from '@/components/pms/RoomGrid';
import { RealtimeRefresh } from '@/components/pms/RealtimeRefresh';

// Real-time synchronization is handled via a client-side subscription.
export const dynamic = 'force-dynamic';

export default async function FrontDeskPage() {
    const supabase = await createClient();

    // Fetch rooms and their active guest (if occupied)
    const { data: rooms } = await supabase
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

    // Map the database structure to the expected Room interface
    // Note: We use a robust YYYY-MM-DD comparison for the India timezone.
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

    const formattedRooms = (rooms || []).map(room => {
        // Find active booking for guest name
        const activeBooking = room.bookings?.find((b: any) => b.status === 'Active');

        // Find active cleaning assignment
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

    return (
        <>
            <RoomGrid initialRooms={formattedRooms as any} />
        </>
    );
}
