import { createClient } from '@/utils/supabase/server';
import { createClient as createJsClient } from '@supabase/supabase-js';
import { getSettings } from '@/app/(dashboard)/settings/actions';
import { notFound } from 'next/navigation';
import PrintButton from './PrintButton';
import { numberToWords } from '../../../utils/numberToWords';
import { cn } from '@/lib/utils';
import { generateInvoiceNo } from '@/utils/billing';
import { formatISTDate, formatISTTime } from '@/utils/date';

export default async function PrintBillPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ provisional?: string; type?: string; _token?: string; token?: string; accounts_token?: string }>;
}) {
    const { id: bookingId } = await params;
    const { provisional, type, _token, token, accounts_token } = await searchParams;
    const isProvisional = provisional === 'true' || type === 'provisional';

    const pdfToken = _token || token;
    const expectedToken = process.env.INTERNAL_PDF_TOKEN || '__GENY_PMS_INTERNAL_SECRET_2026__';

    // Verify Accounts Token if present
    let isAccountsVerified = false;
    if (accounts_token) {
        try {
            const crypto = await import('crypto');
            const [b64Payload, signature] = accounts_token.split('.');
            const expectedSignature = crypto.createHmac('sha256', expectedToken).update(b64Payload).digest('base64url');
            if (signature === expectedSignature) {
                const payloadStr = Buffer.from(b64Payload, 'base64url').toString('utf-8');
                const parsed = JSON.parse(payloadStr);
                if (parsed.iat) {
                    const ageMs = Date.now() - parsed.iat;
                    if (ageMs <= 48 * 60 * 60 * 1000) {
                        isAccountsVerified = true;
                    }
                } else {
                    isAccountsVerified = true;
                }
            }
        } catch (e) {
            console.error('Invalid accounts link token', e);
        }
    }

    let supabase;
    if ((pdfToken && pdfToken === expectedToken) || isAccountsVerified) {
        supabase = createJsClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
    } else {
        supabase = await createClient();
    }
    const settings = await getSettings();

    const { data: booking, error } = await supabase
        .from('bookings')
        .select('*, guests (*), rooms (*), payments (*), companies (*)')
        .eq('id', bookingId)
        .single();

    if (error || !booking) return notFound();

    // Fetch currently logged in user profile for signature (Safe check)
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    const { data: currentUserProfile } = user ? await supabase
        .from('profiles')
        .select('role, signature_url')
        .eq('id', user.id)
        .single() : { data: null };

    // Use user-specific signature for staff, fallback to hotel settings for admin or if staff signature missing
    const authorizedSignature = currentUserProfile?.signature_url || settings.signature_url;

    const { data: orders } = await supabase
        .from('restaurant_orders')
        .select('*')
        .eq('booking_id', bookingId);

    const { data: transfers } = await supabase
        .from('room_transfers')
        .select('*')
        .eq('booking_id', bookingId)
        .order('transferred_at', { ascending: true });

    const { data: extraCharges } = await supabase
        .from('extra_charges')
        .select('*')
        .eq('booking_id', bookingId);

    // Math Engine (Synced with FolioPage)
    const checkIn = new Date(booking.check_in_date);
    const checkInTime = checkIn.getTime();
    const now = new Date();
    const scheduledCheckOut = new Date(booking.check_out_date);
    const actualCheckOut = (booking.status !== 'Checked_Out' && scheduledCheckOut < now) ? now : scheduledCheckOut;
    const checkOutTime = actualCheckOut.getTime();

    const scheduledNights = Math.max(1, Math.ceil((new Date(booking.check_out_date).getTime() - checkInTime) / (1000 * 60 * 60 * 24)));
    const actualNights = Math.max(1, Math.ceil((checkOutTime - checkInTime) / (1000 * 60 * 60 * 24)));
    const totalNights = booking.allow_early_checkout_refund ? actualNights : Math.max(scheduledNights, actualNights);

    // 1. NIGHT AUDIT POSTED CHARGES
    const auditItems = (extraCharges || []).filter(c =>
        c.description.includes('Room Charge') ||
        c.description.includes('Meal Plan Charge') ||
        c.description.includes('Extra Pax Charge') ||
        c.description.includes('Extra Bed Charge')
    );
    const postedAuditTotal = auditItems.reduce((sum, c) => sum + Number(c.amount), 0);
    const auditedDates = new Set(auditItems
        .filter(c => c.description.includes('Room Charge'))
        .map(c => c.description.split(' - ')[1])
    );
    const nightsAudited = auditedDates.size;

    // 2. PROVISIONAL CHARGES (Future/Pending)
    const remainingNights = Math.max(0, totalNights - nightsAudited);
    const provRoomCharge = remainingNights * (Number(booking.rooms?.base_rate) || 0);
    const extraPaxCount = Math.max(0, (booking.pax_count || 0) - (settings.free_pax_limit || 2));
    const provExtraPaxCharge = remainingNights * extraPaxCount * (settings.extra_pax_rate || 0);
    const provExtraBedCharge = remainingNights * (Number(booking.extra_beds) || 0) * (settings.extra_bed_rate || 0);
    const mealPlanRate = settings.meal_plan_rates[booking.food_plan] || 0;
    const provMealCharge = remainingNights * mealPlanRate * (booking.pax_count || 1);

    // Aggregated Category Totals
    const postedRoomOnly = auditItems.filter(c => c.description.includes('Room Charge')).reduce((s, c) => s + Number(c.amount), 0);
    const postedMeals = auditItems.filter(c => c.description.includes('Meal Plan Charge')).reduce((s, c) => s + Number(c.amount), 0);
    const postedExtraPax = auditItems.filter(c => c.description.includes('Extra Pax Charge')).reduce((s, c) => s + Number(c.amount), 0);
    const postedExtraBeds = auditItems.filter(c => c.description.includes('Extra Bed Charge')).reduce((s, c) => s + Number(c.amount), 0);

    const roomTotal = postedRoomOnly + provRoomCharge;
    const mealTotal = postedMeals + provMealCharge;
    const extraPaxTotal = postedExtraPax + provExtraPaxCharge;
    const extraBedTotal = postedExtraBeds + provExtraBedCharge;

    const earlyCheckInCharge = Number(booking.early_check_in_charge || 0);
    const restaurantTotal = (orders || []).reduce((sum, order) => sum + (order.is_refund ? 0 : Number(order.total_amount || order.total || 0)), 0);

    // Manual/Other Charges
    const manualCharges = (extraCharges || []).filter(c => !auditItems.includes(c));
    const extraChargesTotal = manualCharges.reduce((sum, c) => sum + Number(c.amount || 0), 0);

    // Summing up for Taxes
    const subtotalExclusive = roomTotal + mealTotal + extraPaxTotal + extraBedTotal + earlyCheckInCharge + extraChargesTotal + restaurantTotal;

    const cgstAmount = Math.round(subtotalExclusive * settings.cgst_rate / 100);
    const sgstAmount = Math.round(subtotalExclusive * settings.sgst_rate / 100);

    const grandTotal = subtotalExclusive + cgstAmount + sgstAmount;
    const advancePaid = Number(booking.advance_payment) || 0;
    const additionalPayments = booking.payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
    const totalPaid = advancePaid + additionalPayments;

    const roundOff = Math.round(grandTotal) - grandTotal;
    const finalGrandTotal = Math.round(grandTotal);
    const balanceDue = finalGrandTotal - totalPaid;

    const invoiceTitle = isProvisional ? 'Provisional Invoice' : 'Tax Invoice';
    const invoiceNumber = booking.invoice_number || generateInvoiceNo(bookingId, booking.check_in_date);
    const bookingRef = booking.id.slice(0, 8).toUpperCase();
    const invoiceDate = formatISTDate(new Date());
    const timeFormatted = formatISTTime(new Date());

    const formatT = (val: number) => val.toFixed(2);
    const absBalance = Math.abs(balanceDue);

    return (
        <div className="font-sans min-h-screen bg-slate-100 py-8 print:py-0 print:bg-white flex flex-col items-center">
            {/* Screen Controls */}
            <div className="w-[210mm] mb-4 flex justify-end gap-2 print:hidden relative z-50">
                <PrintButton bookingId={bookingId} isProvisional={isProvisional} />
            </div>

            {/* A4 Format */}
            <div className="w-[210mm] min-h-[297mm] print:min-h-0 print:h-auto bg-white print:shadow-none p-8 print:p-0 flex flex-col relative text-[11px] text-slate-800 leading-relaxed mx-auto gap-4 print:overflow-visible overflow-hidden">

                {/* Custom Global CSS to ensure crisp printing borders matching the photo */}
                <style dangerouslySetInnerHTML={{
                    __html: `
                    @media print {
                        @page { size: A4 portrait; margin: 8mm; }
                        body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background-color: white !important; margin: 0; padding: 0; }
                        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    }
                `}} />

                {/* Modular Header */}
                <div className="w-full flex justify-between items-center bg-white rounded-xl p-4 border-2 border-slate-800">
                    <div className="w-[100px] h-[80px] flex-shrink-0 flex items-center justify-center">
                        {settings.logo_url && <img src={settings.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />}
                    </div>
                    <div className="flex-1 text-center flex flex-col items-center justify-center px-4">
                        <h1 className="text-2xl font-black uppercase tracking-wide text-black mb-1">{settings.hotel_name || 'Hotel New Ganga'}</h1>
                        <p className="font-bold text-[10px] text-slate-800 uppercase max-w-[80%] mb-1">{settings.address || 'COMPANY ADDRESS PLACEHOLDER'}</p>
                        <div className="flex gap-3 text-[10px] text-black flex-wrap justify-center font-bold">
                            <span>📞 {settings.phone || 'N/A'}</span>
                            <span>✉️ {settings.email || 'N/A'}</span>
                            <span>🌐 {settings.website || 'www.hotelnewganga.in'}</span>
                        </div>
                        <div className="flex gap-4 text-[10px] text-black font-bold mt-1">
                            <span className="uppercase">GSTIN: {settings.gstin || 'N/A'}</span>
                            <span>CIN: N/A</span>
                        </div>
                    </div>
                    <div className="w-[100px] h-[80px] flex-shrink-0 flex items-center justify-center">
                        {settings.logo_url && <img src={settings.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />}
                    </div>
                </div>

                {/* Title Banner */}
                <div className="w-full flex justify-between items-center px-2">
                    <div className="flex items-center gap-4">
                        <h2 className="text-lg font-bold text-slate-800 tracking-tight uppercase">{invoiceTitle}</h2>
                        {(booking.payments?.some((p: any) => p.is_refund) || orders?.some((o: any) => o.is_refund)) && (
                            <span className="px-3 py-1 bg-red-600 text-white text-[10px] font-black rounded-lg shadow-sm animate-pulse print:animate-none">REFUNDED / ADJUSTED</span>
                        )}
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Date & Time</p>
                        <p className="font-bold text-slate-700">{invoiceDate} <span className="text-slate-500">{timeFormatted}</span></p>
                    </div>
                </div>

                {/* Grid 1: Details Cards */}
                <div className="w-full flex gap-4">
                    {/* Guest Section */}
                    <div className="flex-1 bg-white border-2 border-slate-800 rounded-xl p-4 shadow-sm print:shadow-none">
                        <h3 className="text-[10px] font-black text-black mb-2 uppercase tracking-widest border-b-2 border-slate-800 pb-1.5">Billed To</h3>
                        <table className="w-full font-mono text-[10px] text-slate-600 border-separate border-spacing-y-0.5">
                            <tbody>
                                <tr><td className="w-24 font-bold text-slate-700">Guest Name</td><td>: <span className="uppercase text-slate-900 font-bold">{booking.guests?.name}</span></td></tr>
                                {booking.accompanying_guests?.[0]?.name && <tr><td className="w-24 font-bold text-slate-700">2nd Guest</td><td>: <span className="uppercase">{booking.accompanying_guests[0].name}</span></td></tr>}
                                <tr><td className="w-24 font-bold text-slate-700">Contact</td><td>: {booking.guests?.phone || 'N/A'}</td></tr>
                                <tr><td className="w-24 font-bold text-slate-700 align-top pb-1">Address</td><td className="align-top pb-1">: <span className="uppercase leading-tight">{[booking.guests?.address, booking.guests?.city, booking.guests?.state].filter(Boolean).join(', ') || 'N/A'}</span></td></tr>
                                <tr><td className="w-24 font-bold text-slate-700">Country</td><td>: <span className="uppercase">{booking.guests?.country || 'India'}</span></td></tr>
                                {booking.companies?.name && (
                                    <>
                                        <tr><td className="w-24 font-black text-black pt-2 align-top">Company</td><td className="pt-2 align-top">: <span className="uppercase font-black text-black">{booking.companies.name}</span></td></tr>
                                        <tr><td className="w-24 font-bold text-slate-700 align-top">Company Addr</td><td className="align-top">: <span className="uppercase">{booking.companies.address || booking.companies.city || 'N/A'}</span></td></tr>
                                        <tr><td className="w-24 font-bold text-slate-700">Com. GSTIN</td><td>: <span className="uppercase text-slate-900 font-bold">{booking.companies.gstin || booking.gstin || 'N/A'}</span></td></tr>
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Stay Section */}
                    <div className="flex-1 bg-white border-2 border-slate-800 rounded-xl p-4 shadow-sm print:shadow-none">
                        <h3 className="text-[10px] font-black text-black mb-2 uppercase tracking-widest border-b-2 border-slate-800 pb-1.5">Stay Details</h3>
                        <table className="w-full font-mono text-[10px] text-slate-600 border-separate border-spacing-y-0.5">
                            <tbody>
                                <tr><td className="w-24 font-bold text-slate-700">Invoice No.</td><td>: <span className="font-bold text-slate-900">{invoiceNumber}</span></td></tr>
                                <tr><td className="w-24 font-bold text-slate-700">Booking Ref</td><td>: <span className="uppercase text-slate-800">{bookingRef}</span></td></tr>
                                <tr><td className="w-24 font-bold text-slate-700">GRC No.</td><td>: <span className="uppercase">GRC-{bookingId.slice(-8).toUpperCase()}</span></td></tr>
                                <tr><td className="w-24 font-bold text-slate-700">Room No.</td><td>: <span className="font-bold text-slate-900 text-sm">{booking.rooms?.number}</span> <span className="font-medium text-slate-500">({booking.rooms?.type})</span></td></tr>
                                <tr><td className="w-24 font-bold text-slate-700">Pax</td><td>: {booking.pax_count || (Number(booking.adults || 0) + Number(booking.children || 0))}</td></tr>
                                <tr><td className="w-24 font-bold text-slate-700">Check-in</td><td>: <span className="text-slate-800 font-medium">{formatISTDate(checkIn)}</span> <span className="text-slate-400">{formatISTTime(checkIn)}</span></td></tr>
                                <tr><td className="w-24 font-bold text-slate-700">Check-out</td><td>: <span className="text-slate-800 font-medium">{formatISTDate(actualCheckOut)}</span></td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Main Billing Table */}
                <div className="w-full border-2 border-slate-800 rounded-xl overflow-hidden shadow-sm print:shadow-none min-h-[100px]">
                    <div className="bg-white text-black px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border-b-2 border-slate-800">
                        Itemized Billing
                    </div>
                    <table className="w-full text-center table-fixed font-mono text-[9px]">
                        <thead className="bg-white text-black border-b-2 border-slate-800">
                            <tr>
                                <th className="p-2 font-bold text-left w-[12%]">Date</th>
                                <th className="p-2 font-bold text-right">Room Rent</th>
                                <th className="p-2 font-bold text-right">E.Bed</th>
                                <th className="p-2 font-bold text-right">CGST</th>
                                <th className="p-2 font-bold text-right">SGST</th>
                                <th className="p-2 font-bold text-right">F&B</th>
                                <th className="p-2 font-bold text-right">Other</th>
                                <th className="p-2 font-bold text-right">Advance</th>
                                <th className="p-2 font-bold text-right w-[15%] text-slate-800">Bill Total</th>
                            </tr>
                        </thead>
                        <tbody className="text-slate-700">
                            <tr>
                                <td className="p-2 text-left font-medium">{invoiceDate}</td>
                                <td className="p-2 text-right">{formatT(roomTotal)}</td>
                                <td className="p-2 text-right">{formatT(extraBedTotal)}</td>
                                <td className="p-2 text-right">{formatT(cgstAmount)}</td>
                                <td className="p-2 text-right">{formatT(sgstAmount)}</td>
                                <td className="p-2 text-right">{formatT(restaurantTotal + mealTotal)}</td>
                                <td className="p-2 text-right">{formatT(earlyCheckInCharge + extraPaxTotal + extraChargesTotal)}</td>
                                <td className="p-2 text-right text-green-600 print:text-slate-800">{formatT(totalPaid)}</td>
                                <td className="p-2 text-right font-bold text-slate-900 bg-slate-50 border-l border-slate-100">{formatT(finalGrandTotal)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Sub Tables and Grand Totals Layout */}
                <div className="w-full flex gap-4">
                    {/* Bottom Left Area */}
                    <div className="w-[60%] flex flex-col gap-4">
                        {/* GST Breakdown Module */}
                        <div className="border-2 border-slate-800 rounded-xl overflow-hidden shadow-sm print:shadow-none">
                            <h4 className="bg-white text-[10px] font-black uppercase tracking-widest text-black px-3 py-1.5 border-b-2 border-slate-800">GST Breakdown</h4>
                            <table className="text-center font-mono text-[9px] w-full text-slate-800">
                                <thead>
                                    <tr className="border-b-2 border-slate-800 text-black font-bold bg-white">
                                        <th className="p-1.5">GST(%)</th>
                                        <th className="p-1.5">Taxable Value</th>
                                        <th className="p-1.5">CGST</th>
                                        <th className="p-1.5">SGST</th>
                                        <th className="p-1.5">Total Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="bg-white">
                                        <td className="p-1.5 font-bold text-slate-800">{Number(settings.cgst_rate || 0) + Number(settings.sgst_rate || 0)}%</td>
                                        <td className="p-1.5">{formatT(subtotalExclusive)}</td>
                                        <td className="p-1.5">{formatT(cgstAmount)}</td>
                                        <td className="p-1.5">{formatT(sgstAmount)}</td>
                                        <td className="p-1.5 font-bold text-slate-900">{formatT(subtotalExclusive + cgstAmount + sgstAmount)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Receipts Module */}
                        <div className="border-2 border-slate-800 rounded-xl overflow-hidden shadow-sm print:shadow-none">
                            <h4 className="bg-white text-[10px] font-black uppercase tracking-widest text-black px-3 py-1.5 border-b-2 border-slate-800">Payment Schedule</h4>
                            <table className="text-center font-mono text-[9px] w-full text-slate-800">
                                <thead>
                                    <tr className="border-b-2 border-slate-800 text-black font-bold bg-white">
                                        <th className="p-1.5">Date</th>
                                        <th className="p-1.5">Invoice #</th>
                                        <th className="p-1.5 max-w-[80px] break-words">Mode</th>
                                        <th className="p-1.5">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {booking.advance_payment > 0 && (
                                        <tr className="bg-white">
                                            <td className="p-1.5">{formatISTDate(checkIn)}</td>
                                            <td className="p-1.5 font-bold text-slate-900">{invoiceNumber}</td>
                                            <td className="p-1.5 uppercase font-medium max-w-[80px] truncate">{booking.advance_payment_mode}</td>
                                            <td className="p-1.5 font-bold text-slate-800 text-green-600 print:text-slate-800">{formatT(Number(booking.advance_payment))}</td>
                                        </tr>
                                    )}
                                    {(booking.payments || []).map((p: any, i: number) => (
                                        <tr key={i} className={cn("bg-white", Number(p.amount) < 0 && "bg-red-50")}>
                                            <td className="p-1.5">{formatISTDate(p.created_at)}</td>
                                            <td className="p-1.5 font-bold text-slate-900">{invoiceNumber}</td>
                                            <td className="p-1.5 uppercase font-medium max-w-[80px] truncate">{p.payment_method}</td>
                                            <td className={cn(
                                                "p-1.5 font-bold text-slate-800 print:text-slate-800",
                                                Number(p.amount) < 0 ? "text-red-500" : "text-green-600"
                                            )}>
                                                {Number(p.amount) < 0 ? `(REFUND) ${formatT(Math.abs(Number(p.amount)))}` : formatT(Number(p.amount))}
                                            </td>
                                        </tr>
                                    ))}
                                    {booking.advance_payment === 0 && (!booking.payments || booking.payments.length === 0) && (
                                        <tr className="bg-white"><td colSpan={4} className="p-3 text-slate-400 italic">No payments recorded</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Bottom Right Area (Summary Block) */}
                    <div className="w-[40%] flex flex-col justify-end">
                        <div className="bg-white border-2 border-slate-800 text-black rounded-xl p-4 shadow-sm print:shadow-none mt-auto">
                            <table className="w-full font-mono text-[11px] font-black">
                                <tbody className="space-y-2 block">
                                    <tr className="flex justify-between w-full">
                                        <td className="py-1 text-slate-800">Gross Invoice Value</td>
                                        <td className="py-1 text-right font-black">{formatT(grandTotal)}</td>
                                    </tr>
                                    <tr className="flex justify-between w-full">
                                        <td className="py-1 text-slate-800">Payments Received</td>
                                        <td className="py-1 text-right text-black font-black">- {formatT(totalPaid)}</td>
                                    </tr>
                                    {booking.payments?.some((p: any) => p.is_refund) && (
                                        <tr className="flex justify-between w-full text-red-600">
                                            <td className="py-1 font-bold">Less: Refunds / Returns</td>
                                            <td className="py-1 text-right font-black">+ {formatT(Math.abs(booking.payments.filter((p: any) => p.is_refund).reduce((s: number, p: any) => s + Number(p.amount), 0)))}</td>
                                        </tr>
                                    )}
                                    <tr className="flex justify-between w-full border-b-2 border-slate-800 pb-2 mb-2">
                                        <td className="py-0 text-slate-800">Round Off</td>
                                        <td className="py-0 text-right font-black">{formatT(roundOff)}</td>
                                    </tr>
                                    <tr className="flex justify-between w-full mt-2 items-end">
                                        <td className={cn(
                                            "pt-2 font-black text-[12px] tracking-widest uppercase",
                                            balanceDue === 0 ? "text-emerald-700" : "text-slate-800"
                                        )}>
                                            {balanceDue < 0 ? 'Refundable Due' : (balanceDue === 0 ? 'Account Status' : 'Net Amount Payable')}
                                        </td>
                                        <td className={cn(
                                            "pt-2 text-right font-black text-xl leading-none tracking-tighter",
                                            balanceDue === 0 ? "text-emerald-700 text-2xl tracking-widest" : "text-slate-900"
                                        )}>
                                            {balanceDue === 0 ? 'PAID' : `₹ ${formatT(absBalance)}`}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p className={cn(
                            "mt-3 text-[9px] font-mono text-center uppercase tracking-widest font-bold px-2",
                            balanceDue === 0 ? "text-emerald-600/80" : "text-slate-500"
                        )}>
                            {balanceDue === 0 ? 'FULLY SETTLED' : numberToWords(absBalance)}
                        </p>
                    </div>
                </div>

                {/* Footer Covenants & Disclaimers */}
                <div className="mt-auto pt-6 flex flex-col w-full">
                    <div className="bg-white border-2 border-slate-800 rounded-xl p-3 text-[9px] text-black font-bold leading-relaxed mb-4">
                        <ul className="list-disc list-inside grid grid-cols-2 gap-x-4 gap-y-1">
                            <li>All bills are payable on presentation.</li>
                            <li>Checkout time is strictly {settings.checkout_time || '12:00 NOON'}.</li>
                            <li>Please handover your room key upon checkout.</li>
                            <li>Subject to local jurisdiction only.</li>
                            <li className="col-span-2">We are not liable for inconveniences caused by external factors (e.g. power failure). Clearances require Housekeeping confirmation.</li>
                        </ul>
                    </div>

                    {/* Signatures Row */}
                    <div className="flex justify-between items-end border-t border-slate-200 pt-6 px-4">
                        <div className="flex flex-col items-center justify-end h-16">
                            <div className="w-32 border-b-2 border-slate-300 border-dashed mb-2"></div>
                            <p className="font-bold text-[10px] text-slate-700 uppercase tracking-wider">Guest's Signature</p>
                        </div>

                        <div className="flex gap-8 items-end">
                            {/* Visual Digital Signature Stamp */}
                            {settings.digital_signature_pfx_base64 && (
                                <div className="print-exact flex items-center gap-2 px-3 py-1.5 border border-green-600 rounded bg-green-50 mb-1" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                                    <div className="text-green-600">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-5 h-5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    </div>
                                    <div className="flex flex-col text-left">
                                        <span className="text-[11px] font-black text-green-800 leading-none mb-0.5">Signature valid</span>
                                        <span className="text-[7px] font-medium text-green-700 leading-tight uppercase tracking-widest">Digitally signed by {settings.hotel_name || 'Hotel Admin'}<br />Date: {invoiceDate}</span>
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col items-center justify-end h-24">
                                <div className="h-20 mb-1 w-48 flex items-end justify-center border-b border-transparent">
                                    {authorizedSignature ? (
                                        // Increased height for better visibility
                                        <img src={authorizedSignature} alt="Authorized Signature" style={{ height: '70px', width: 'auto', objectFit: 'contain', display: 'block' }} />
                                    ) : (
                                        <div className="w-32 border-b-2 border-slate-300 border-dashed mb-1"></div>
                                    )}
                                </div>
                                <p className="font-bold text-[10px] text-slate-700 uppercase tracking-wider text-center">
                                    Authorized Signatory<br />
                                    <span className="text-[8px] font-medium text-slate-500 mt-0.5 inline-block">{settings.hotel_name || 'Hotel New Ganga'}</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-3 border-t-2 border-slate-800 flex justify-between items-center text-black">
                        <div className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                            <span>⚡ Generated by</span> <span className="text-black">Geny PMS Pro</span>
                        </div>
                        <div className="text-[8px] font-black uppercase tracking-widest">
                            MediaGeny Tech Solutions
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
