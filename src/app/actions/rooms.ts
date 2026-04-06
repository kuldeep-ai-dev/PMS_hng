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
