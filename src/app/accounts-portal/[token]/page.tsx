import crypto from 'crypto';
import { createAdminClient } from '@/utils/supabase/admin';
import { getSettings } from '@/app/(dashboard)/settings/actions';
import { generateInvoiceNo } from '@/utils/billing';
import AccountsPortalClient from './AccountsPortalClient';

export const metadata = {
    title: 'Accounts Portal | Hotel New Ganga',
    robots: {
        index: false,
        follow: false,
    }
};

function verifyToken(b64Payload: string, signature: string) {
    try {
        if (!b64Payload || !signature) {
            console.error('[AccountsPortal] Missing payload or signature');
            return null;
        }

        const secret = process.env.INTERNAL_PDF_TOKEN || '__GENY_PMS_INTERNAL_SECRET_2026__';
        const expectedSignature = crypto.createHmac('sha256', secret).update(b64Payload).digest('base64url');

        if (signature !== expectedSignature) {
            console.error('[AccountsPortal] Signature mismatch');
            return null;
        }

        const payloadStr = Buffer.from(b64Payload, 'base64url').toString('utf-8');
        const parsed = JSON.parse(payloadStr);

        // Verify 48 hour expiration
        if (parsed.iat) {
            const ageMs = Date.now() - parsed.iat;
            if (ageMs > 48 * 60 * 60 * 1000) {
                console.error('[AccountsPortal] Token expired');
                return null;
            }
        }

        return parsed;
    } catch (e: any) {
        console.error('[AccountsPortal] Exception in verifyToken:', e.message);
        return null;
    }
}

function InvalidLink() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h1 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Invalid or Expired Link</h1>
                <p className="text-slate-500 mb-6">This accounts portal access link is not valid or has been revoked. Links expire after 48 hours.</p>
            </div>
        </div>
    );
}

export default async function AccountsPortalPage({
    params,
    searchParams
}: {
    params: Promise<{ token: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    // Support both URL path token (legacy), query param 't' (legacy dot-separated), 
    // and the new robust format with separate 'p' (payload) and 's' (signature).
    const { token: pathToken } = await params;
    const qs = await searchParams;
    const queryTokenT = typeof qs.t === 'string' ? qs.t : undefined;
    const queryTokenP = typeof qs.p === 'string' ? qs.p : undefined;
    const queryTokenS = typeof qs.s === 'string' ? qs.s : undefined;

    let payload = null;
    let rawToken = '';

    if (queryTokenP && queryTokenS) {
        // New robust format
        payload = verifyToken(queryTokenP, queryTokenS);
        rawToken = `${queryTokenP}.${queryTokenS}`; // reconstructed for internal use
    } else {
        // Legacy formats (dot-separated)
        const legacyToken = queryTokenT || pathToken;
        if (legacyToken && legacyToken.includes('.')) {
            const lastDot = legacyToken.lastIndexOf('.');
            const p = legacyToken.substring(0, lastDot);
            const s = legacyToken.substring(lastDot + 1);
            payload = verifyToken(p, s);
            rawToken = legacyToken;
        }
    }

    if (!payload || !payload.startDate || !payload.endDate) return <InvalidLink />;

    const { startDate, endDate } = payload;
    const adminSupabase = createAdminClient();
    const settings = await getSettings();

    // 1. Fetch Room Payments
    const { data: roomPayments } = await adminSupabase
        .from('payments')
        .select(`
            id, amount, method, created_at, is_refund,
            booking_id,
            bookings ( check_in_date, is_settled, status, bill_to_company, guests (name), rooms (number) )
        `)
        .gte('created_at', `${startDate}T00:00:00Z`)
        .lte('created_at', `${endDate}T23:59:59Z`)
        .order('created_at', { ascending: false });

    // 2. Fetch Restaurant Payments
    const { data: posPayments } = await adminSupabase
        .from('restaurant_orders')
        .select(`
            id, total_amount, payment_mode, order_time, is_refund, payment_status, bill_no,
            booking_id, guests (name), customer_name, rooms (number), restaurant_tables(table_number)
        `)
        .in('payment_status', ['paid', 'charged_to_room'])
        .in('status', ['preparing', 'ready', 'served', 'completed'])
        .gte('order_time', `${startDate}T00:00:00Z`)
        .lte('order_time', `${endDate}T23:59:59Z`)
        .order('order_time', { ascending: false });

    // Combine Data
    const receipts = [
        ...(roomPayments || []).map((p: any) => ({
            id: p.id,
            date: p.created_at,
            regnNo: generateInvoiceNo(p.booking_id, p.bookings?.check_in_date || p.created_at),
            guestName: p.bookings?.guests?.name || 'Unknown',
            amount: p.amount,
            method: p.method,
            status: p.is_refund ? 'Refunded' : 'Paid',
            type: 'Room',
            downloadId: p.booking_id,
            downloadType: 'bill',
            rawToken // pass token to client for download auth
        })),
        ...(posPayments || []).map((p: any) => ({
            id: p.id,
            date: p.order_time,
            regnNo: p.bill_no ? `BILL-${p.bill_no}` : generateInvoiceNo(p.id, p.order_time),
            guestName: p.guests?.name || p.customer_name || 'Walk-in',
            amount: p.total_amount,
            method: p.payment_status === 'charged_to_room' ? 'Billed to Folio' : (p.payment_mode || 'Paid'),
            status: p.is_refund ? 'Refunded' : 'Paid',
            type: 'Restaurant',
            downloadId: p.id,
            downloadType: 'pos-bill',
            rawToken // pass token to client for download auth
        }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return <AccountsPortalClient receipts={receipts} startDate={startDate} endDate={endDate} hotelName={settings?.hotel_name} accountsToken={rawToken} />;
}
