'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getLostAndFoundItems() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('lost_and_found')
        .select('*, rooms (number)')
        .order('found_date', { ascending: false });

    if (error) throw error;
    return data;
}

export async function addLostAndFoundItem(formData: {
    item_name: string;
    type: 'Lost' | 'Found';
    description?: string;
    location_found?: string;
    found_date?: string;
    finder_name?: string;
    reporter_phone?: string;
    room_id?: string | null;
}) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('lost_and_found')
        .insert([{
            ...formData,
            room_id: formData.room_id || null,
            status: formData.type === 'Found' ? 'Found' : 'Lost'
        }])
        .select()
        .single();

    if (error) throw error;
    revalidatePath('/operations/lost-and-found');
    return data;
}

export async function updateItemStatus(id: string, status: 'Claimed' | 'Disposed' | 'Resolved', details?: {
    claimant_name?: string;
    claimant_phone?: string;
}) {
    const supabase = await createClient();
    const updateData: any = {
        status,
        updated_at: new Date().toISOString()
    };

    if (status === 'Claimed') {
        updateData.claimant_name = details?.claimant_name;
        updateData.claimant_phone = details?.claimant_phone;
        updateData.claimed_date = new Date().toISOString();
    }

    const { error } = await supabase
        .from('lost_and_found')
        .update(updateData)
        .eq('id', id);

    if (error) throw error;
    revalidatePath('/operations/lost-and-found');
    return { success: true };
}

export async function deleteItem(id: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from('lost_and_found')
        .delete()
        .eq('id', id);

    if (error) throw error;
    revalidatePath('/operations/lost-and-found');
    return { success: true };
}

export async function markAsFound(id: string, details?: {
    location_found?: string;
    found_date?: string;
    finder_name?: string;
}) {
    const supabase = await createClient();
    const { error } = await supabase
        .from('lost_and_found')
        .update({
            ...details,
            type: 'Found',
            status: 'Found',
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) throw error;
    revalidatePath('/operations/lost-and-found');
    return { success: true };
}
