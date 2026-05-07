import { createClient } from '@/utils/supabase/server';
import { getSettings } from '@/app/(dashboard)/settings/actions';
import { notFound } from 'next/navigation';
import POSPrintActions from './POSPrintActions';
import { numberToWords } from '@/utils/numberToWords';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/billing';
import { formatCurrencySync } from '@/lib/currency';
import { formatISTDate, formatISTTime } from '@/utils/date';

export default async function PrintPOSBillPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ _token?: string; token?: string; accounts_token?: string }>;
}) {
    const { id: orderId } = await params;
    const { _token, token, accounts_token } = await searchParams;

    const pdfToken = _token || token;
    const expectedToken = process.env.INTERNAL_PDF_TOKEN || '__geny_pms_internal_pdf_2026__';

    // Verify Accounts Token if present
    let isAccountsVerified = false;
    if (accounts_token) {
        try {
            const crypto = await import('crypto');
            const [b64Payload, signature] = accounts_token.split('.');
            const expectedSignature = crypto.createHmac('sha256', expectedToken).update(b64Payload).digest('base64url');
            if (signature === expectedSignature) {
                isAccountsVerified = true;
            }
        } catch (e) {
            console.error('Invalid accounts link token', e);
        }
    }

    let supabase;
    if ((pdfToken && pdfToken === expectedToken) || isAccountsVerified) {
        const { createClient: createJsClient } = await import('@supabase/supabase-js');
        supabase = createJsClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
    } else {
        supabase = await createClient();
    }

    const settings = await getSettings();

    const { data: order, error } = await supabase
        .from('restaurant_orders')
        .select(`
            *,
            restaurant_order_items (
                *,
                restaurant_menu_items (*)
            ),
            restaurant_customers (*),
            rooms (number),
            restaurant_tables (table_number)
        `)
        .eq('id', orderId)
        .single();

    if (error || !order) return notFound();

    // Fetch currently logged in user profile for signature (Safe check)
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    const { data: currentUserProfile } = user ? await supabase
        .from('profiles')
        .select('role, signature_url')
        .eq('id', user.id)
        .single() : { data: null };

    // Use user-specific signature for staff, fallback to hotel settings for admin
    const authorizedSignature = currentUserProfile?.signature_url || settings.signature_url;

    const billDate = formatISTDate(order.order_time);
    const billTime = formatISTTime(order.order_time);

    const subtotal = Number(order.subtotal || 0);
    const tax = Number(order.tax || 0);
    const totalWithTax = subtotal + tax;
    const loyaltyDiscount = Number(order.loyalty_discount_amount || 0);
    const finalTotal = Math.round(totalWithTax - loyaltyDiscount);
    const roundOff = finalTotal - (totalWithTax - loyaltyDiscount);

    return (
        <div className="font-sans min-h-screen bg-slate-50 py-4 print:py-0 print:bg-white flex flex-col items-center">
            {/* Screen Controls */}
            <POSPrintActions />

            {/* 80mm Thermal Format */}
            <div className="w-[80mm] bg-white p-4 print:p-2 flex flex-col relative text-[10px] text-black leading-tight mx-auto gap-3 print:overflow-visible overflow-hidden shadow-2xl print:shadow-none">

                <style dangerouslySetInnerHTML={{
                    __html: `
                    @media print {
                        @page { size: 80mm auto; margin: 0; }
                        body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; margin: 0; padding: 0; }
                        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    }
                    body { color: black !important; }
                    .dashed-line { border-top: 1px dashed black; margin: 4px 0; }
                `}} />

                {/* Header with Logo */}
                <div className="text-center space-y-1">
                    {settings.logo_url && (
                        <div className="flex justify-center mb-2">
                            <img src={settings.logo_url} alt="Logo" className="h-12 w-auto object-contain grayscale brightness-0" />
                        </div>
                    )}
                    <h1 className="text-sm font-black uppercase tracking-tight leading-none">{settings.hotel_name || 'Hotel New Ganga'}</h1>
                    <p className="text-[8px] font-medium leading-tight px-4">{settings.address}</p>
                    <div className="text-[9px] font-bold flex flex-col items-center gap-0.5 pt-1">
                        {settings.gstin && <span className="uppercase">GSTIN: {settings.gstin.toUpperCase()}</span>}
                        <span className="bg-black text-white px-2 py-0.5 rounded text-[8px] mt-1">TAX INVOICE</span>
                    </div>
                </div>

                <div className="dashed-line"></div>

                {/* Bill Info Compact */}
                <div className="grid grid-cols-2 gap-x-2 text-[9px]">
                    <div className="flex flex-col gap-0.5">
                        <div className="flex justify-between">
                            <span className="font-bold opacity-60 uppercase">Bill No:</span>
                            <span className="font-black">#{order.bill_no || '---'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-bold opacity-60 uppercase">KOT:</span>
                            <span className="font-bold">KOT-{order.kot_no}</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-0.5 text-right">
                        <div>{billDate}</div>
                        <div>{billTime}</div>
                    </div>
                </div>

                <div className="flex justify-between items-center py-1 bg-slate-50 px-1 rounded">
                    <span className="font-bold opacity-60 uppercase text-[8px]">Location:</span>
                    <span className="font-black text-[11px] uppercase">
                        {order.restaurant_tables?.table_number ? `Table ${order.restaurant_tables.table_number}` : (order.rooms?.number ? `Room ${order.rooms.number}` : 'Walk-in')}
                    </span>
                </div>

                <div className="dashed-line"></div>

                {/* Items Table Compact */}
                <table className="w-full text-[9px] border-collapse">
                    <thead>
                        <tr className="border-b border-black">
                            <th className="py-1 text-left">ITEM</th>
                            <th className="py-1 text-center w-[12%]">QTY</th>
                            <th className="py-1 text-right w-[25%]">AMT</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(order.restaurant_order_items || []).map((item: any, i: number) => (
                            <tr key={i} className="border-b border-slate-100 last:border-0">
                                <td className="py-1.5 uppercase font-bold pr-1 leading-none">
                                    {item.restaurant_menu_items?.name}
                                </td>
                                <td className="py-1.5 text-center font-black">{item.quantity}</td>
                                <td className="py-1.5 text-right font-black">{(item.price_at_time * item.quantity).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="dashed-line"></div>

                {/* Totals Section */}
                <div className="space-y-0.5">
                    <div className="flex justify-between">
                        <span className="font-bold uppercase opacity-60">Subtotal:</span>
                        <span className="font-bold">{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[8px]">
                        <span className="font-bold uppercase tracking-tight">TAX (GST 5%):</span>
                        <span>{tax.toFixed(2)}</span>
                    </div>
                    {loyaltyDiscount > 0 && (
                        <div className="flex justify-between text-black font-black">
                            <span>LOYALTY DISCOUNT:</span>
                            <span>-{loyaltyDiscount.toFixed(2)}</span>
                        </div>
                    )}

                    <div className="flex justify-between items-center bg-black text-white p-1.5 rounded mt-1">
                        <span className="font-black uppercase text-[10px]">Grand Total</span>
                        <span className="font-black text-lg">₹{finalTotal.toLocaleString('en-IN')}</span>
                    </div>
                </div>

                {/* Payment Info */}
                <div className="text-center py-1 bg-slate-100 rounded text-[8px] font-black uppercase tracking-widest mt-1">
                    Paid via: {order.payment_mode || (order.payment_status === 'charged_to_room' ? 'Charge to Room' : 'Cash/UPI')}
                </div>

                {/* Branding Footer */}
                <div className="mt-4 flex flex-col items-center gap-2 border-t border-black pt-2">

                    {/* Authorized Signature for POS */}
                    <div className="flex flex-col items-center w-full mb-2">
                        <div className="h-16 w-full flex items-end justify-center mb-1">
                            {authorizedSignature ? (
                                <img src={authorizedSignature} alt="Authorized Signature" className="max-h-full w-auto grayscale brightness-0 opacity-100 scale-125" />
                            ) : (
                                <div className="w-24 border-b border-black border-dashed opacity-30 h-10"></div>
                            )}
                        </div>
                        <span className="text-[7px] font-black uppercase tracking-[0.2em] opacity-80">Authorized Signature</span>
                    </div>

                    <p className="text-[10px] font-black italic tracking-widest uppercase mb-1">Thank You! Visit Again</p>

                    <div className="flex flex-col items-center gap-1">
                        <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter">Powered by</span>
                        <div className="flex items-center gap-1 bg-black px-3 py-1 rounded-full">
                            <div className="w-3 h-3 rounded-sm bg-teal-500 flex items-center justify-center text-black text-[6px] font-black">G</div>
                            <span className="text-[8px] font-black uppercase text-white tracking-widest">Geny PMS Pro</span>
                        </div>
                    </div>

                    <p className="text-[6px] font-medium text-slate-400 uppercase italic mt-1">
                        A Product by Mediageny Tech Solutions
                    </p>
                </div>
            </div>
        </div>
    );
}
