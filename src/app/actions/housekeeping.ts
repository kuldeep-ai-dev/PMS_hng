'use server';

import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { sendHousekeepingAssignmentWhatsApp } from './whatsapp';

const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getCleaningStaff() {
    const { data: allStaff, error: staffErr } = await supabaseAdmin
        .from('profiles')
        .select('id, name')
        .eq('role', 'cleaning_staff')
        .eq('status', 'active');

    if (staffErr) throw staffErr;

    // Get busy staff
    const { data: busyStaff } = await supabaseAdmin
        .from('cleaning_assignments')
        .select('staff_id, status');

    const busyIds = new Set(
        busyStaff?.filter(s => {
            const status = s.status?.toLowerCase().replace('-', '_');
            return status === 'pending' || status === 'in_progress';
        }).map(s => s.staff_id) || []
    );

    // Mark busy vs available
    return allStaff.map(s => ({
        ...s,
        isBusy: busyIds.has(s.id)
    })) || [];
}

export async function getAvailableCleaningStaff() {
    const staff = await getCleaningStaff();
    const available = staff.filter(s => !s.isBusy);
    return available.length > 0 ? available : staff; // Fallback to all staff if none are free
}

export async function assignCleaningStaff(roomId: string, staffId: string) {
    // Fetch all current assignments to check for duplicates (case-insensitive)
    const { data: allAssignments } = await supabaseAdmin
        .from('cleaning_assignments')
        .select('id, status')
        .eq('room_id', roomId);

    const existing = allAssignments?.find(a => {
        const s = a.status?.toLowerCase().replace('-', '_');
        return s === 'pending' || s === 'in_progress';
    });

    if (existing) {
        const { error } = await supabaseAdmin
            .from('cleaning_assignments')
            .update({
                staff_id: staffId,
                status: 'pending',
                assigned_at: new Date().toISOString()
            })
            .eq('id', existing.id);
        if (error) throw error;
    } else {
        const { error } = await supabaseAdmin
            .from('cleaning_assignments')
            .insert({
                room_id: roomId,
                staff_id: staffId,
                status: 'pending',
                assigned_at: new Date().toISOString()
            });
        if (error) throw error;
    }

    if (!existing) {
        // Find newly created assignment ID if needed, or just use the logic below
    }

    // Trigger WhatsApp notification for the assigned staff
    // We need to get the ID after insert if it's new
    const { data: currentAssignment } = await supabaseAdmin
        .from('cleaning_assignments')
        .select('id')
        .eq('room_id', roomId)
        .filter('status', 'in', '("pending","in_progress")')
        .order('assigned_at', { ascending: false })
        .limit(1)
        .single();

    if (currentAssignment) {
        console.log('[Housekeeping] Triggering WhatsApp for assignment:', currentAssignment.id);
        sendHousekeepingAssignmentWhatsApp(currentAssignment.id).catch(err => {
            console.error('[Housekeeping] WhatsApp notify failed:', err.message);
        });
    }

    revalidatePath('/front-desk');
    revalidatePath('/admin/housekeeping');
    return { success: true };
}

export async function getHousekeepingLogs() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('cleaning_assignments')
        .select(`
            *,
            rooms (number),
            profiles (name)
        `)
        .order('assigned_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function getStaffTasks(staffId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('cleaning_assignments')
        .select(`
            *,
            rooms (number, type)
        `)
        .eq('staff_id', staffId)
        .order('assigned_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function updateCleaningStatus(assignmentId: string, status: string) {
    const supabase = await createClient();
    const cleanStatus = status.toLowerCase().trim().replace('-', '_');
    const updateData: any = { status: cleanStatus };

    if (cleanStatus === 'in_progress' || cleanStatus === 'in progress') {
        updateData.status = 'in_progress';
        updateData.started_at = new Date().toISOString();
    } else if (cleanStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();

        // Also update the room status back to Available
        const { data: assignment } = await supabase
            .from('cleaning_assignments')
            .select('room_id')
            .eq('id', assignmentId)
            .single();

        if (assignment) {
            await supabase.from('rooms').update({ status: 'Available' }).eq('id', assignment.room_id);
        }
    }

    const { error } = await supabase
        .from('cleaning_assignments')
        .update(updateData)
        .eq('id', assignmentId);

    if (error) throw error;
    revalidatePath('/front-desk');
    revalidatePath('/admin/housekeeping');
    revalidatePath('/');
    return { success: true };
}
