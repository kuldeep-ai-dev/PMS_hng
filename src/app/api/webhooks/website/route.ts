import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSettings } from '@/app/(dashboard)/settings/actions';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: Request) {
    try {
        const signature = req.headers.get('x-gateway-signature');
        const eventType = req.headers.get('x-gateway-event');
        const source = req.headers.get('x-gateway-source');

        if (source !== 'hotel_new_ganga_website') {
            return NextResponse.json({ error: 'Invalid source' }, { status: 400 });
        }

        const rawBody = await req.text();

        // Validate signature
        const settings = await getSettings();
        const secret = settings.webhook_secret;

        if (!secret) {
            return NextResponse.json({ error: 'Gateway not configured on PMS' }, { status: 503 });
        }

        if (signature) {
            const expectedHash = "sha256=" + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
            if (signature !== expectedHash) {
                return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
            }
        } else {
            return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
        }

        const payload = JSON.parse(rawBody);
        const data = payload.data;

        // Use service role key to bypass RLS for server-to-server inserting
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        if (eventType === 'booking.created') {
            // 1. Upsert Guest using phone number
            const phone = data.phone || data.guest_phone || 'UNKNOWN';
            const name = data.name || data.guest_name || 'Website Guest';
            const email = data.email || data.guest_email || null;

            const { data: guest, error: guestError } = await supabase
                .from('guests')
                .upsert({
                    name,
                    phone,
                    email,
                }, { onConflict: 'phone' })
                .select()
                .single();

            if (guestError) {
                console.error('Webhook Guest Upsert Error:', guestError);
                return NextResponse.json({ error: 'Failed to create guest', details: guestError }, { status: 500 });
            }

            // 2. Insert Booking (leaving room_id null so front-desk can assign it later)
            // The website data usually provides check_in, check_out
            const check_in_date = data.check_in_date || new Date().toISOString();
            const check_out_date = data.check_out_date || new Date(Date.now() + 86400000).toISOString();

            const { error: bookingError } = await supabase
                .from('bookings')
                .insert({
                    guest_id: guest.id,
                    room_id: null, // Room unassigned
                    check_in_date,
                    check_out_date,
                    status: 'Active',
                    total_bill: data.total_price || data.amount || 0,
                    purpose_of_visit: 'Leisure',
                    advance_payment: data.advance_payment || 0,
                    advance_payment_mode: 'Online'
                });

            if (bookingError) {
                console.error('Webhook Booking Insert Error:', bookingError);
                return NextResponse.json({ error: 'Failed to create booking', details: bookingError }, { status: 500 });
            }

            return NextResponse.json({ success: true, message: 'Booking created' });
        }

        // Just acknowledge other events for now to prevent retries
        return NextResponse.json({ success: true, message: 'Event ignored' });

    } catch (error: any) {
        console.error('Webhook Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
