'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getLoyaltySettings() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('restaurant_loyalty_settings')
        .select('*')
        .limit(1)
        .single();

    if (error && error.code !== 'PGRST116') throw error;

    // Return default settings if none exist
    return data || {
        points_per_rupee: 0.1,
        rupee_value_per_point: 1.0,
        min_redeem_points: 100,
        is_active: false
    };
}

export async function updateLoyaltySettings(settings: any) {
    const supabase = await createClient();

    const payload = {
        points_per_rupee: settings.points_per_rupee,
        rupee_value_per_point: settings.rupee_value_per_point,
        min_redeem_points: settings.min_redeem_points,
        is_active: settings.is_active,
        updated_at: new Date().toISOString()
    };

    let error;
    if (settings.id) {
        const { error: updateError } = await supabase
            .from('restaurant_loyalty_settings')
            .update(payload)
            .eq('id', settings.id);
        error = updateError;
    } else {
        const { error: insertError } = await supabase
            .from('restaurant_loyalty_settings')
            .insert([payload]);
        error = insertError;
    }

    if (error) throw error;
    revalidatePath('/restaurant/loyalty');
    return { success: true };
}

export async function getCustomerWallet(mobileNumber: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('restaurant_loyalty_wallets')
        .select('*')
        .eq('mobile_number', mobileNumber)
        .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
}

export async function getLoyaltyTransactions(mobileNumber: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('restaurant_loyalty_transactions')
        .select('*, order:restaurant_orders(bill_no)')
        .eq('mobile_number', mobileNumber)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
}

export async function redeemLoyaltyPoints(mobileNumber: string, points: number, orderId?: string) {
    const supabase = await createClient();

    // 1. Check balance
    const { data: wallet, error: walletError } = await supabase
        .from('restaurant_loyalty_wallets')
        .select('points_balance')
        .eq('mobile_number', mobileNumber)
        .single();

    if (walletError) throw walletError;
    if (wallet.points_balance < points) throw new Error('Insufficient points balance');

    // 2. Register transaction (Redeem)
    const { error: transError } = await supabase
        .from('restaurant_loyalty_transactions')
        .insert([{
            mobile_number: mobileNumber,
            order_id: orderId || null,
            points_delta: -points,
            transaction_type: 'redeem',
            description: 'Points redeemed for discount'
        }]);

    if (transError) throw transError;

    // 3. Update wallet balance
    const { error: updateError } = await supabase
        .from('restaurant_loyalty_wallets')
        .update({
            points_balance: wallet.points_balance - points,
            updated_at: new Date().toISOString()
        })
        .eq('mobile_number', mobileNumber);

    if (updateError) throw updateError;

    return { success: true };
}
