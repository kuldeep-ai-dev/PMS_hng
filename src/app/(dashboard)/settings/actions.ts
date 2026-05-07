'use server';

import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import { createClient } from '@/utils/supabase/server';


const DEFAULT_SETTINGS = {
    hotel_name: "My Hotel",
    currency: "INR",
    currency_symbol: "₹",
    gstin: "",
    cgst_rate: 6,
    sgst_rate: 6,
    address: "",
    phone: "",
    email: "",
    logo_url: "",
    signature_url: "",
    accountant_name: "",
    accountant_email: "",
    webhook_secret: "",
    inbound_api_key: "",
    whatsapp_enabled: false,
    audit_window_start: "23:00",
    audit_window_end: "02:00",
    free_pax_limit: 2,
    extra_bed_rate: 1000,
    extra_pax_rate: 800,
    whatsapp_booking_template: "booking_confirmation",
    whatsapp_checkout_template: "checkout_thankyou",
    whatsapp_restaurant_template: "restaurant_thankyou",
    meal_plan_rates: {
        EP: 0,
        CP: 500,
        MAP: 1000,
        AP: 1500,
        AI: 2500
    },
    early_checkin_rules: [
        { time_limit: "06:00", charge_percentage: 100, label: "Full Day Charge" },
        { time_limit: "10:00", charge_percentage: 50, label: "Half Day Charge" },
        { time_limit: "12:00", charge_percentage: 0, label: "Complimentary" }
    ]
};

import { createAdminClient } from '@/utils/supabase/admin';

const _fetchSettings = unstable_cache(
    async () => {
        const supabase = createAdminClient();
        const { data, error } = await supabase
            .from('hotel_settings')
            .select('*')
            .single();
        if (error || !data) {
            console.error('Cache fetch error for settings:', error);
            return DEFAULT_SETTINGS;
        }
        return data;
    },
    ['hotel-settings'],
    { revalidate: 300, tags: ['settings'] } // 5-minute TTL
);

export async function getSettings() {
    try {
        return await _fetchSettings();
    } catch {
        return DEFAULT_SETTINGS;
    }
}

export async function updateSettings(settings: any) {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const { id, ...updateData } = settings;

    // ── Guard: never wipe inbound_api_key with an empty string ──────────────
    // If the caller sends an empty inbound_api_key, fetch the current value
    // from the DB and preserve it so a settings save can't break the
    // website booking connection.
    if (!updateData.inbound_api_key) {
        const { data: current } = await adminSupabase
            .from('hotel_settings')
            .select('inbound_api_key')
            .single();
        if (current?.inbound_api_key) {
            updateData.inbound_api_key = current.inbound_api_key;
        }
    }
    // ────────────────────────────────────────────────────────────────────────

    const { error } = await supabase
        .from('hotel_settings')
        .update(updateData)
        .eq('id', id);

    if (error) {
        console.error('Error updating settings:', error);
        return { success: false, error: error.message };
    }

    // Bust the unstable_cache for settings so the next request fetches fresh data
    revalidatePath('/settings');
    revalidatePath('/check-in');
    revalidatePath('/');
    return { success: true };
}
