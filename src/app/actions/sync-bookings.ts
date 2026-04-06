'use server';

import { getSettings, updateSettings } from '@/app/(dashboard)/settings/actions';
import { createClient } from '@supabase/supabase-js';

const WEBSITE_BASE_URL = 'https://www.hotelnewganga.in';

function getAdminSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

/**
 * Pull pending bookings from the HNG website's REST API
 * and insert them into the website_bookings staging table.
 */
export async function syncBookingsFromWebsite() {
    const settings = await getSettings();
    const apiKey = settings.inbound_api_key;

    if (!apiKey) {
        return { success: false, message: 'Inbound API Key is not configured. Generate one in Settings first.' };
    }

    try {
        const res = await fetch(`${WEBSITE_BASE_URL}/api/pms/bookings?status=pending&limit=100`, {
            headers: { 'X-PMS-API-Key': apiKey },
            cache: 'no-store',
        });

        if (!res.ok) {
            const text = await res.text();
            return { success: false, message: `Website API returned ${res.status}: ${text.substring(0, 200)}` };
        }

        const result = await res.json();
        const bookings = result.data || [];

        if (bookings.length === 0) {
            return { success: true, message: 'No pending bookings found on the website.', synced: 0 };
        }

        const supabase = getAdminSupabase();
        let syncedCount = 0;
        const errors: string[] = [];

        for (const b of bookings) {
            try {
                const websiteId = b.id || b.booking_id || null;

                // Skip if already synced (by website_id)
                if (websiteId) {
                    const { data: existing } = await supabase
                        .from('website_bookings')
                        .select('id')
                        .eq('website_id', websiteId)
                        .maybeSingle();

                    if (existing) continue;
                }

                const { error } = await supabase
                    .from('website_bookings')
                    .insert({
                        website_id: websiteId,
                        guest_name: b.name || b.guest_name || 'Guest',
                        phone: b.phone || b.guest_phone || b.contact || '',
                        email: b.email || b.guest_email || null,
                        check_in_date: b.check_in_date || b.check_in || b.checkin_date || null,
                        check_out_date: b.check_out_date || b.check_out || b.checkout_date || null,
                        room_type: b.room_type || b.category || null,
                        total_price: b.total_price || b.amount || b.total || 0,
                        guests_count: b.guests || b.adults || 1,
                        special_requests: b.special_requests || b.notes || null,
                        status: 'pending',
                        raw_data: b,
                    });

                if (error) {
                    errors.push(`"${b.name || b.guest_name}": ${error.message}`);
                } else {
                    syncedCount++;
                }
            } catch (err: any) {
                errors.push(`Unexpected: ${err.message}`);
            }
        }

        return {
            success: true,
            message: `Synced ${syncedCount} new booking(s) from ${bookings.length} found.`,
            synced: syncedCount,
            total: bookings.length,
            errors: errors.length > 0 ? errors : undefined,
        };
    } catch (err: any) {
        return { success: false, message: `Network error: ${err.message}` };
    }
}

/**
 * Fetch all website bookings from the staging table.
 */
export async function getWebsiteBookings(statusFilter?: string) {
    const supabase = getAdminSupabase();

    let query = supabase
        .from('website_bookings')
        .select('*')
        .order('synced_at', { ascending: false });

    if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    if (error) {
        console.error('Error fetching website bookings:', error);
        return [];
    }
    return data || [];
}

/**
 * Mark a website booking as confirmed (after the user proceeds to check-in).
 */
export async function confirmWebsiteBooking(id: string) {
    const supabase = getAdminSupabase();

    const { error } = await supabase
        .from('website_bookings')
        .update({ status: 'confirmed' })
        .eq('id', id);

    if (error) {
        return { success: false, message: error.message };
    }
    return { success: true };
}

/**
 * Reject / dismiss a website booking.
 */
export async function rejectWebsiteBooking(id: string) {
    const supabase = getAdminSupabase();

    const { error } = await supabase
        .from('website_bookings')
        .update({ status: 'rejected' })
        .eq('id', id);

    if (error) {
        return { success: false, message: error.message };
    }
    return { success: true };
}

/**
 * Trigger the website's POST /api/pms/sync endpoint.
 */
export async function triggerWebsiteSync() {
    const settings = await getSettings();
    const apiKey = settings.inbound_api_key;

    if (!apiKey) {
        return { success: false, message: 'Inbound API Key is not configured.' };
    }

    try {
        const res = await fetch(`${WEBSITE_BASE_URL}/api/pms/sync`, {
            method: 'POST',
            headers: { 'X-PMS-API-Key': apiKey },
            cache: 'no-store',
        });

        if (!res.ok) {
            const text = await res.text();
            return { success: false, message: `Sync trigger returned ${res.status}: ${text.substring(0, 200)}` };
        }

        return { success: true, message: 'Sync triggered. The website will now push events.' };
    } catch (err: any) {
        return { success: false, message: `Network error: ${err.message}` };
    }
}
