'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';

export async function getSettings() {
    const supabase = await createClient();
    try {
        const { data, error } = await supabase
            .from('hotel_settings')
            .select('*')
            .single();

        if (error || !data) {
            throw new Error('Could not fetch hotel settings');
        }

        return data;
    } catch (e) {
        return {
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

    revalidatePath('/settings');
    revalidatePath('/'); // Refresh dashboard if needed
    revalidatePath('/login'); // Refresh login page cache
    return { success: true };
}
