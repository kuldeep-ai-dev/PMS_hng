'use server';

import { revalidatePath, unstable_cache } from 'next/cache';
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
    }
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
    const { id, ...updateData } = settings;

    const { error } = await supabase
        .from('hotel_settings')
        .update(updateData)
        .eq('id', id);

    if (error) {
        console.error('Error updating settings:', error);
        return { success: false, error: error.message };
    }

    // Bust next.js route cache so next request gets fresh data
    revalidatePath('/settings', 'page');
    revalidatePath('/', 'layout');
    return { success: true };
}
