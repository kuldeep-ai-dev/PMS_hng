'use server'

import { createClient } from '@/utils/supabase/server';

export async function verifyBill(invoiceNo: string) {
    if (!invoiceNo || !invoiceNo.startsWith('INV-')) {
        throw new Error('Invalid Invoice Number format. Expected INV-YYYYMMDD-XXXX');
    }

    const parts = invoiceNo.split('-');
    if (parts.length !== 3) {
        throw new Error('Invalid Registration Number format.');
    }

    const dateStr = parts[1]; // YYYYMMDD
    const suffix = parts[2].toLowerCase(); // XXXX

    if (dateStr.length !== 8 || suffix.length !== 4) {
        throw new Error('Invalid Registration Number format.');
    }

    const year = dateStr.slice(0, 4);
    const month = dateStr.slice(4, 6);
    const day = dateStr.slice(6, 8);
    const targetDate = `${year}-${month}-${day}`;

    const supabase = await createClient();

    // Query for bookings on that check-in date
    // We filter by suffix in JS to avoid complex Postgres casting if possible, 
    // or use a structured query if performance is an issue.
    const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
            *,
            guests (name, phone, email),
            rooms (number, type, base_rate),
            payments (amount, payment_method, created_at),
            companies (name)
        `)
        .eq('check_in_date', targetDate);

    if (error) throw error;

    // Match the suffix
    const matched = bookings.find((b: any) => b.id.toLowerCase().endsWith(suffix));

    if (!matched) {
        return null;
    }

    return matched;
}
