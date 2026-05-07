'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
});

const createStaffSchema = z.object({
    name: z.string().min(2, 'Name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.enum(['admin', 'front_desk', 'manager', 'restaurant_staff', 'cleaning_staff', 'master']),
    photo_url: z.string().optional().nullable(),
    signature_url: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
});

// ─── Create Staff ────────────────────────────────────────
export async function createStaffMember(formData: FormData) {
    try {
        const rawData = {
            name: formData.get('name'),
            email: formData.get('email'),
            password: formData.get('password'),
            role: formData.get('role'),
            photo_url: formData.get('photo_url') || null,
            signature_url: formData.get('signature_url') || null,
            phone: formData.get('phone') || null,
            address: formData.get('address') || null,
        };

        const parsed = createStaffSchema.parse(rawData);

        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: parsed.email,
            password: parsed.password,
            email_confirm: true,
            user_metadata: { name: parsed.name, role: parsed.role },
        });

        if (authError) {
            return { success: false, error: authError.message };
        }

        const userId = authData.user.id;

        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: userId,
                name: parsed.name,
                role: parsed.role,
                status: 'active',
                phone: parsed.phone,
                address: parsed.address,
                ...(parsed.photo_url ? { photo_url: parsed.photo_url } : {}),
                ...(parsed.signature_url ? { signature_url: parsed.signature_url } : {}),
            }, { onConflict: 'id' });

        if (profileError) {
            return { success: true, warning: 'Auth account created but profile save failed: ' + profileError.message };
        }

        revalidatePath('/admin/staff');
        return { success: true, warning: undefined };
    } catch (error: any) {
        return { success: false, error: error.message || 'An unexpected error occurred' };
    }
}

// ─── Update Staff ────────────────────────────────────────
export async function updateStaffMember(formData: FormData) {
    try {
        const id = formData.get('id') as string;
        const name = formData.get('name') as string;
        const role = formData.get('role') as string;
        const status = formData.get('status') as string;
        const photo_url = formData.get('photo_url') as string | null;
        const signature_url = formData.get('signature_url') as string | null;
        const phone = formData.get('phone') as string | null;
        const address = formData.get('address') as string | null;

        if (!id || !name || !role || !status) {
            return { success: false, error: 'Missing required fields' };
        }

        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({
                name,
                role,
                status,
                phone,
                address,
                ...(photo_url !== null ? { photo_url } : {}),
                ...(signature_url !== null ? { signature_url } : {}),
            })
            .eq('id', id);

        if (profileError) {
            return { success: false, error: profileError.message };
        }

        await supabaseAdmin.auth.admin.updateUserById(id, {
            user_metadata: { name, role },
        });

        revalidatePath('/admin/staff');
        return { success: true, warning: undefined };
    } catch (error: any) {
        return { success: false, error: error.message || 'An unexpected error occurred' };
    }
}

// ─── Delete Staff ────────────────────────────────────────
export async function deleteStaffMember(userId: string) {
    try {
        if (!userId) return { success: false, error: 'Missing user ID' };

        // 1. Delete cleaning assignments for this staff
        await supabaseAdmin.from('cleaning_assignments').delete().eq('staff_id', userId);

        // 2. Delete profile
        await supabaseAdmin.from('profiles').delete().eq('id', userId);

        // 3. Delete auth user (this is the key revocation)
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (authError) {
            return { success: false, error: authError.message };
        }

        revalidatePath('/admin/staff');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || 'An unexpected error occurred' };
    }
}

// ─── Upload Photo (server-side) ─────────────────────────
export async function uploadStaffPhoto(base64Data: string, fileName: string) {
    try {
        // Convert base64 to buffer
        const base64Content = base64Data.split(',')[1] || base64Data;
        const buffer = Buffer.from(base64Content, 'base64');

        const filePath = `staff/${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

        const { data, error } = await supabaseAdmin.storage
            .from('avatars')
            .upload(filePath, buffer, {
                contentType: 'image/webp',
                upsert: true,
            });

        if (error) {
            return { success: false, error: error.message };
        }

        const publicUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${data.path}`;
        return { success: true, url: publicUrl };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
