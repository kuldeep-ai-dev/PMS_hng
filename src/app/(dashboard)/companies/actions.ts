'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { sendSettlementMail } from '@/app/actions/mail';

export async function getCompanies() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
}

export async function getCompanyById(id: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data;
}

export async function createCompany(company: any) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('companies')
        .insert([company])
        .select()
        .single();

    if (error) throw error;
    revalidatePath('/companies');
    return data;
}

export async function updateCompany(id: string, updates: any) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    revalidatePath('/companies');
    revalidatePath(`/companies/${id}`);
    return data;
}

export async function deleteCompany(id: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', id);

    if (error) throw error;
    revalidatePath('/companies');
}

export async function getCompanyBookings(companyId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('bookings')
        .select(`
            *,
            guests (*),
            rooms (*)
        `)
        .eq('company_id', companyId)
        .order('check_in_date', { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function markAsSettled(bookingId: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from('bookings')
        .update({ is_settled: true })
        .eq('id', bookingId);

    if (error) throw error;

    // Automatically send thank you & settled invoice to company
    await sendSettlementMail(bookingId).catch(err => console.error('[Settlement] Mail failed:', err));

    revalidatePath('/companies');
    revalidatePath('/dashboard'); // Update main dashboard stats too
    return { success: true };
}
