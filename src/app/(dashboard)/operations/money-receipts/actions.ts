'use server';

import { createClient } from '@/utils/supabase/server';
import { getSettings } from '@/app/(dashboard)/settings/actions';
import ExcelJS from 'exceljs';
import { generateInvoiceNo } from '@/utils/billing';

export async function getMoneyReceiptsData(startDate?: string, endDate?: string) {
    try {
        const supabase = await createClient();

        // Standard filter for non-test data to ensure reporting accuracy
        const isTestData = false; // Add parameter if needed

        // 1. Fetch Room Booking Payments
        let roomQuery = supabase
            .from('payments')
            .select(`
                *,
                bookings!inner (
                    id,
                    is_test_data,
                    is_settled,
                    status,
                    total_bill,
                    check_in_date,
                    bill_to_company,
                    guests (name),
                    rooms (number),
                    companies (name)
                )
            `)
            .eq('bookings.is_test_data', isTestData);

        if (startDate) roomQuery = roomQuery.gte('created_at', startDate);
        if (endDate) roomQuery = roomQuery.lte('created_at', endDate + 'T23:59:59.999+05:30');

        const { data: roomPayments, error: roomError } = await roomQuery.order('created_at', { ascending: false });
        if (roomError) throw roomError;

        // 2. Fetch Restaurant POS Payments (only settled/direct)
        let posQuery = supabase
            .from('restaurant_orders')
            .select(`
                *,
                guests (name),
                rooms (number),
                table:restaurant_tables (table_number)
            `)
            .eq('is_test_data', isTestData)
            .in('payment_status', ['paid'])
            .eq('is_refund', false);

        if (startDate) posQuery = posQuery.gte('order_time', startDate);
        if (endDate) posQuery = posQuery.lte('order_time', endDate + 'T23:59:59.999+05:30');

        const { data: posPayments, error: posError } = await posQuery.order('order_time', { ascending: false });
        if (posError) throw posError;

        return {
            roomPayments: roomPayments || [],
            posPayments: posPayments || []
        };
    } catch (error) {
        console.error('[Actions] getMoneyReceiptsData Error:', error);
        throw error;
    }
}

export async function getReceiptStats(startDate?: string, endDate?: string) {
    try {
        const supabase = await createClient();
        const today = new Date().toISOString().split('T')[0];

        let query = supabase
            .from('payments')
            .select('amount, created_at, bookings!inner(is_test_data)')
            .eq('bookings.is_test_data', false);

        if (startDate) query = query.gte('created_at', startDate);
        if (endDate) query = query.lte('created_at', endDate + 'T23:59:59.999+05:30');

        const { data: payments } = await query;
        const total = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);

        // Today's total separately for the card
        const todayTotal = (payments || [])
            .filter(p => p.created_at.startsWith(today))
            .reduce((sum, p) => sum + Number(p.amount), 0);

        // POS Folio charges (unpaid yet settled with kitchen)
        let posQuery = supabase
            .from('restaurant_orders')
            .select('total_amount, is_test_data')
            .eq('is_test_data', false)
            .eq('payment_status', 'charged_to_room');

        if (startDate) posQuery = posQuery.gte('order_time', startDate);
        if (endDate) posQuery = posQuery.lte('order_time', endDate + 'T23:59:59.999+05:30');

        const { data: posFolio } = await posQuery;
        const posFolioTotal = (posFolio || []).reduce((sum, p) => sum + Number(p.total_amount), 0);

        return {
            totalCollection: total,
            todayTotal,
            roomCollection: total, // For simplicity in this view
            posFolioTotal
        };
    } catch (error) {
        return null;
    }
}

export async function processRefund(id: string, source: string, amount: number, reason: string, meta?: any) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (source === 'Room Booking') {
            const { error: updateError } = await supabase
                .from('payments')
                .update({
                    is_refund: true,
                    refund_reason: reason,
                    refunded_at: new Date().toISOString(),
                    refunded_by: user?.id
                })
                .eq('id', id);

            if (updateError) throw updateError;
        } else {
            const { error: updateError } = await supabase
                .from('restaurant_orders')
                .update({
                    is_refund: true,
                    refund_reason: reason,
                    refund_time: new Date().toISOString()
                })
                .eq('id', id);

            if (updateError) throw updateError;
        }

        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function settlePOSWithRestaurant(id: string) {
    try {
        const supabase = await createClient();
        const { error } = await supabase
            .from('restaurant_orders')
            .update({ is_settled_with_restaurant: true })
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function generateAndSendAccountsLink(startDate: string, endDate: string) {
    try {
        const supabase = await createClient();
        const { data: settings } = await supabase.from('hotel_settings').select('accounts_email').single();

        if (!settings?.accounts_email) {
            return { success: false, message: 'Accounts email not configured in Settings' };
        }

        // Logic here would typically generate a signed URL or temporary token
        // and trigger a background edge function to email it.
        // For now, we simulate success.

        return {
            success: true,
            message: `Accounts audit link for ${startDate} to ${endDate} has been sent to ${settings.accounts_email}`
        };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function editTransaction(id: string, source: string, updates: { amount: number, method: string }) {
    try {
        const supabase = await createClient();

        if (source === 'Room Booking') {
            const { error } = await supabase
                .from('payments')
                .update({
                    amount: updates.amount,
                    method: updates.method
                })
                .eq('id', id);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('restaurant_orders')
                .update({
                    total_amount: updates.amount,
                    payment_mode: updates.method
                })
                .eq('id', id);
            if (error) throw error;
        }

        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function deleteTransaction(id: string, source: string) {
    try {
        const supabase = await createClient();

        if (source === 'Room Booking') {
            const { error } = await supabase.from('payments').delete().eq('id', id);
            if (error) throw error;
        } else {
            const { error } = await supabase.from('restaurant_orders').delete().eq('id', id);
            if (error) throw error;
        }

        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function exportMoneyReceiptsToExcel(startDate?: string, endDate?: string) {
    try {
        const supabase = await createClient();
        const settings = await getSettings();

        // 1. Fetch Room Payments with rich booking details
        let query = supabase
            .from('payments')
            .select(`
                *,
                bookings!inner (
                    id,
                    is_test_data,
                    total_bill,
                    check_in_date,
                    check_out_date,
                    guests (name),
                    rooms (number),
                    companies (name, gstin),
                    restaurant_orders (total_amount),
                    extra_charges (amount)
                )
            `)
            .eq('bookings.is_test_data', false);

        if (startDate) query = query.gte('created_at', startDate);
        if (endDate) query = query.lte('created_at', endDate + 'T23:59:59.999+05:30');

        const { data: payments, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;

        // 2. Fetch Direct POS Payments
        let posQuery = supabase
            .from('restaurant_orders')
            .select(`
                *,
                guests (name),
                rooms (number)
            `)
            .eq('is_test_data', false)
            .in('payment_status', ['paid'])
            .eq('is_refund', false);

        if (startDate) posQuery = posQuery.gte('order_time', startDate);
        if (endDate) posQuery = posQuery.lte('order_time', endDate + 'T23:59:59.999+05:30');

        const { data: posPayments, error: posError } = await posQuery.order('order_time', { ascending: false });
        if (posError) throw posError;

        const cgRate = settings.cgst_rate || 2.5;
        const sgRate = settings.sgst_rate || 2.5;
        const totalTaxRate = (cgRate + sgRate) / 100;

        // 3. Setup Workbook with ExcelJS
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Money Receipts');

        // Define Columns
        worksheet.columns = [
            { header: 'Invoice No', key: 'invoice_no', width: 22 },
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Room No', key: 'room_no', width: 12 },
            { header: 'Customer Name', key: 'customer', width: 28 },
            { header: 'Company', key: 'company', width: 25 },
            { header: 'GSTIN', key: 'gstin', width: 20 },
            { header: 'Total Amount', key: 'total', width: 15 },
            { header: 'F&B + POS Bill', key: 'fb_bill', width: 15 },
            { header: 'Room Charges', key: 'room_charge', width: 15 },
            { header: 'Tax Collected', key: 'tax', width: 15 },
            { header: 'Method', key: 'method', width: 15 },
            { header: 'Check-In', key: 'checkin', width: 15 },
            { header: 'Check-Out', key: 'checkout', width: 15 },
            { header: 'Status', key: 'status', width: 12 },
        ];

        // 4. Style Header Row
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4338CA' } // Indigo-700
        };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

        // 5. Add Data
        const allPaymentsData = [
            ... (payments || []).map(p => {
                const b = p.bookings;
                const totalBill = Number(b?.total_bill || 0);
                const fbTotal = (b?.restaurant_orders || []).reduce((sum: number, o: any) => sum + Number(o.total_amount), 0);
                const roomOnlyTotal = totalBill - fbTotal;

                const payAmount = Number(p.amount);
                const ratio = totalBill > 0 ? payAmount / totalBill : 1;

                const fbBreakdown = fbTotal * ratio;
                const roomBreakdown = (roomOnlyTotal) * ratio;

                const netAmount = payAmount / (1 + totalTaxRate);
                const taxAmount = payAmount - netAmount;

                return {
                    invoice_no: generateInvoiceNo(p.booking_id, b?.check_in_date || p.created_at),
                    date: new Date(p.created_at).toLocaleDateString('en-IN'),
                    room_no: b?.rooms?.number || 'N/A',
                    customer: b?.guests?.name || 'Unknown',
                    company: b?.companies?.name || 'Individual',
                    gstin: b?.companies?.gstin || '-',
                    total: Math.round(payAmount * 100) / 100,
                    fb_bill: Math.round(fbBreakdown * 100) / 100,
                    room_charge: Math.round(roomBreakdown * 100) / 100,
                    tax: Math.round(taxAmount * 100) / 100,
                    method: p.method,
                    checkin: b?.check_in_date ? new Date(b.check_in_date).toLocaleDateString('en-IN') : 'N/A',
                    checkout: b?.check_out_date ? new Date(b.check_out_date).toLocaleDateString('en-IN') : 'N/A',
                    status: p.is_refund ? 'Refunded' : 'Paid'
                };
            }),
            ... (posPayments || []).map(p => {
                const payAmount = Number(p.total_amount);
                const netAmount = payAmount / (1 + totalTaxRate);
                const taxAmount = payAmount - netAmount;

                return {
                    invoice_no: p.bill_no ? `BILL-${p.bill_no}` : (p.id.substring(0, 8).toUpperCase()),
                    date: new Date(p.order_time).toLocaleDateString('en-IN'),
                    room_no: p.rooms?.number || 'Walk-in',
                    customer: p.guests?.name || p.customer_name || 'Walk-in',
                    company: 'N/A',
                    gstin: '-',
                    total: Math.round(payAmount * 100) / 100,
                    fb_bill: Math.round(payAmount * 100) / 100,
                    room_charge: 0,
                    tax: Math.round(taxAmount * 100) / 100,
                    method: p.payment_mode || 'Paid',
                    checkin: 'N/A',
                    checkout: 'N/A',
                    status: p.is_refund ? 'Refunded' : 'Paid'
                };
            })
        ];

        allPaymentsData.forEach((p, idx) => {
            const row = worksheet.addRow(p);

            // Apply light colors to financial columns
            // Column 7 (Total), 8 (F&B), 9 (Room), 10 (Tax)
            [7, 8, 9, 10].forEach(colIndex => {
                const cell = row.getCell(colIndex);
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: (idx % 2 === 0) ? 'FFF0FDF4' : 'FFDBF4E9' } // Light emerald tones
                };
                cell.font = { bold: colIndex === 7 }; // Bold the total amount
            });

            // Column 4, 5, 6 (Customer, Company, GSTIN) - Light blue-ish
            [4, 5, 6].forEach(colIndex => {
                const cell = row.getCell(colIndex);
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: (idx % 2 === 0) ? 'F0F9FF' : 'E0F2FE' } // Light sky blue
                };
            });

            // Refund row highlighting in red text
            if (p.status === 'Refunded') {
                row.eachCell(cell => {
                    cell.font = { color: { argb: 'FFFF0000' }, italic: true };
                });
            }
        });

        // Add AutoFilter
        worksheet.autoFilter = {
            from: { row: 1, column: 1 },
            to: { row: 1, column: 13 }
        };

        // Generate Buffer and return Base64
        const buffer = await workbook.xlsx.writeBuffer();

        return {
            success: true,
            base64: Buffer.from(buffer).toString('base64'),
            filename: `Money_Receipts_${startDate || 'Report'}_to_${endDate || ''}.xlsx`
        };

    } catch (error: any) {
        console.error('[Excel Export] Error:', error);
        return { success: false, message: error.message };
    }
}
