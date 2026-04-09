'use client';

import { createClient } from '@/utils/supabase/client';

export async function fetchRooms() {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('rooms')
        .select('id, number, type, status, base_rate, updated_at')
        .order('number', { ascending: true });
    if (error) throw error;
    return data || [];
}

export async function addRoom(room: { number: string; type: string; base_rate: number }) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('rooms')
        .insert({
            number: room.number,
            type: room.type,
            base_rate: room.base_rate,
            status: 'Available'
        })
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function updateRoomRate(roomId: string, newRate: number) {
    const supabase = createClient();
    const { error } = await supabase
        .from('rooms')
        .update({ base_rate: newRate, updated_at: new Date().toISOString() })
        .eq('id', roomId);
    if (error) throw error;
}

export async function toggleMaintenance(roomId: string, currentStatus: string) {
    const supabase = createClient();
    const newStatus = currentStatus === 'Maintenance' ? 'Available' : 'Maintenance';
    const { error } = await supabase
        .from('rooms')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', roomId);
    if (error) throw error;
    return newStatus;
}

export async function deleteRoom(roomId: string) {
    const supabase = createClient();
    const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', roomId);
    if (error) throw error;
}

export async function markRoomCleaned(roomId: string) {
    const supabase = createClient();
    const { error } = await supabase
        .from('rooms')
        .update({ status: 'Available', updated_at: new Date().toISOString() })
        .eq('id', roomId);
    if (error) throw error;
    return 'Available';
}
