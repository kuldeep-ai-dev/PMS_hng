'use server';

import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);


export async function getInventoryItems() {
    const { data, error } = await supabaseAdmin
        .from('inventory_items')
        .select('*, category:inventory_categories(name)')
        .order('name');

    if (error) throw new Error(error.message);
    return data;
}

export async function getActiveStaff() {
    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id, name, role')
        .in('role', ['cleaning_staff', 'restaurant_staff', 'front_desk', 'manager', 'admin', 'master'])
        .eq('status', 'active')
        .order('name');

    if (error) throw new Error(error.message);
    return data;
}

export async function getInventoryCategories() {
    const { data, error } = await supabaseAdmin
        .from('inventory_categories')
        .select('*')
        .order('name');

    if (error) throw new Error(error.message);
    return data;
}


export async function adjustStock(formData: {
    itemId: string;
    quantity: number;
    type: 'ADD' | 'REMOVE' | 'ADJUST';
    reason: string;
    performedBy?: string;
}) {
    const supabase = await createClient();

    const { error } = await supabase.from('inventory_stock_adjustments').insert({
        item_id: formData.itemId,
        quantity: formData.type === 'REMOVE' ? -Math.abs(formData.quantity) : Math.abs(formData.quantity),
        adjustment_type: formData.type,
        reason: formData.reason,
        performed_by: formData.performedBy,
    });

    if (error) throw new Error(error.message);

    revalidatePath('/inventory');
    return { success: true };
}

export async function recordUsage(formData: {
    itemId: string;
    quantity: number;
    roomId: string;
    staffId: string;
}) {
    const { error } = await supabaseAdmin.from('inventory_usage').insert({

        item_id: formData.itemId,
        quantity: formData.quantity,
        room_id: formData.roomId,
        staff_id: formData.staffId,
    });

    if (error) throw new Error(error.message);

    revalidatePath('/inventory');
    return { success: true };
}

export async function getInventoryLedger() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('inventory_ledger')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
}

export async function updateItemThreshold(itemId: string, threshold: number) {
    const supabase = await createClient();
    const { error } = await supabase
        .from('inventory_items')
        .update({ min_threshold: threshold })
        .eq('id', itemId);

    if (error) throw new Error(error.message);

    revalidatePath('/inventory');
    return { success: true };
}

export async function addInventoryItem(formData: {
    name: string;
    unit: string;
    categoryId: string | null;
    initialStock: number;
    minThreshold: number;
}) {
    const supabase = await createClient();

    // 1. Create the item
    const { data: item, error: itemError } = await supabase
        .from('inventory_items')
        .insert({
            name: formData.name,
            unit: formData.unit,
            category_id: formData.categoryId || null,
            current_stock: 0, // start at 0; trigger will update from adjustment
            min_threshold: formData.minThreshold,
        })
        .select()
        .single();

    if (itemError) throw new Error(itemError.message);

    // 2. If initial stock > 0, insert an opening adjustment
    if (formData.initialStock > 0) {
        const { error: adjError } = await supabase.from('inventory_stock_adjustments').insert({
            item_id: item.id,
            quantity: formData.initialStock,
            adjustment_type: 'ADD',
            reason: 'Opening stock',
        });
        if (adjError) throw new Error(adjError.message);
    }

    revalidatePath('/inventory');
    return { success: true };
}

export async function addInventoryCategory(name: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('inventory_categories')
        .insert({ name })
        .select()
        .single();

    if (error) throw new Error(error.message);
    revalidatePath('/inventory');
    return data;
}

export async function verifyStaffPassword(staffId: string, password: string) {
    // 1. Get user email from auth.users via admin client
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(staffId);

    if (userError || !userData?.user?.email) {
        throw new Error('User not found or email missing');
    }

    // 2. Try to sign in with that email and password
    // We use a separate client for this to avoid affecting the current session
    const tempClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: authData, error: authError } = await tempClient.auth.signInWithPassword({
        email: userData.user.email,
        password: password,
    });

    if (authError) {
        console.error('Housekeeping Auth Error:', authError.message, 'for email:', userData.user.email);
        throw new Error('Invalid password');
    }

    console.log('Housekeeping Auth Success for:', userData.user.email);
    return { success: true };
}


