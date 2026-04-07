'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { logSystemEvent } from './activity';

export type LicenseStatus = {
    id: string;
    is_active: boolean;
    expiry_date: string;
    is_trial: boolean;
    is_revoked: boolean;
    revocation_reason: string | null;
    renewal_amount: number;
    last_updated: string;
};

/**
 * Fetch the system-wide license status.
 * This is a singleton table, so we always take the first record.
 */
export async function getLicenseStatus(): Promise<LicenseStatus | null> {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('system_license')
            .select('*')
            .single();

        if (error) {
            console.error('[License] Error fetching status:', error.message);
            return null;
        }

        return data as LicenseStatus;
    } catch (err) {
        console.error('[License] Error:', err);
        return null;
    }
}

/**
 * Update the license configuration.
 * Strictly restricted to users with the 'master' role via RLS.
 */
export async function updateLicenseStatus(updates: Partial<LicenseStatus>) {
    try {
        const supabase = await createClient();

        // Fetch the singleton ID first
        const { data: current } = await supabase.from('system_license').select('id').single();
        if (!current) throw new Error('License record not found.');

        const { error } = await supabase
            .from('system_license')
            .update({
                ...updates,
                last_updated: new Date().toISOString()
            })
            .eq('id', current.id);

        if (error) throw error;

        // Log the change at application level
        await logSystemEvent({
            event_type: 'INFO',
            module: 'license',
            description: `Global license settings updated. Revoked: ${updates.is_revoked}, Trial: ${updates.is_trial}`,
            metadata: updates
        });

        revalidatePath('/master-control', 'page');
        revalidatePath('/admin/license', 'page');
        revalidatePath('/', 'layout');
        return { success: true };
    } catch (err: any) {
        console.error('[License] Update failed:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Helper to check if the current system is valid/active.
 */
export async function isSystemValid(): Promise<{ valid: boolean; reason?: string }> {
    const status = await getLicenseStatus();
    if (!status) return { valid: true }; // Defensive: don't lock out if DB check fails randomly

    if (status.is_revoked) {
        return { valid: false, reason: status.revocation_reason || 'Software access has been revoked.' };
    }

    const expiryDate = new Date(status.expiry_date);
    if (expiryDate < new Date()) {
        return { valid: false, reason: 'Software license has expired.' };
    }

    if (!status.is_active) {
        return { valid: false, reason: 'Software is currently inactive.' };
    }

    return { valid: true };
}

// --- Renewal Request Workflow ---

export type RenewalRequest = {
    id: string;
    user_id: string;
    hotel_name?: string;
    amount: number;
    transaction_id: string;
    payment_mode: 'UPI' | 'Bank Transfer' | 'Cash' | 'Other';
    status: 'pending' | 'accepted' | 'denied';
    denial_message?: string;
    created_at: string;
};

export async function submitRenewalRequest(data: Omit<RenewalRequest, 'id' | 'user_id' | 'status' | 'created_at'>) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error } = await supabase
            .from('license_renewal_requests')
            .insert({
                ...data,
                user_id: user.id,
                status: 'pending'
            });

        if (error) throw error;

        revalidatePath('/admin/license');
        return { success: true };
    } catch (err: any) {
        console.error('[Renewal] Submission failed:', err.message);
        return { success: false, error: err.message };
    }
}

export async function getRenewalRequests(): Promise<RenewalRequest[]> {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('license_renewal_requests')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as RenewalRequest[];
    } catch (err) {
        console.error('[Renewal] Fetch failed:', err);
        return [];
    }
}

export async function getClientRenewalRequests(): Promise<RenewalRequest[]> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('license_renewal_requests')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as RenewalRequest[];
    } catch (err) {
        console.error('[Renewal] Client fetch failed:', err);
        return [];
    }
}

export async function updateRenewalRequestStatus(id: string, status: 'accepted' | 'denied', message?: string) {
    try {
        const supabase = await createClient();
        const { error } = await supabase
            .from('license_renewal_requests')
            .update({
                status,
                denial_message: message,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;

        // Log the change
        await logSystemEvent({
            event_type: 'INFO',
            module: 'license',
            description: `Renewal request ${status} for request ID ${id}`,
            metadata: { id, status, message }
        });

        revalidatePath('/master-control/license', 'page');
        revalidatePath('/admin/license', 'page');
        revalidatePath('/', 'layout');
        return { success: true };
    } catch (err: any) {
        console.error('[Renewal] Status update failed:', err.message);
        return { success: false, error: err.message };
    }
}
