import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role — no user session needed for link tracking
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Default fallback if no destination URL is configured
const DEFAULT_REDIRECT = 'https://www.google.com/maps';

/**
 * GET /api/l/[id]
 * 
 * Tracked link redirector.
 * 1. Looks up the whatsapp_analytics record by wamid OR tracking_id
 * 2. Updates status to 'clicked' and sets clicked_at
 * 3. Performs a 302 redirect to the destination_url (Google Review link)
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        // Try to find by wamid first, then by tracking_id
        let record: any = null;

        const { data: byWamid } = await supabase
            .from('whatsapp_analytics')
            .select('id, status, destination_url')
            .eq('wamid', id)
            .single();

        if (byWamid) {
            record = byWamid;
        } else {
            const { data: byTrackingId } = await supabase
                .from('whatsapp_analytics')
                .select('id, status, destination_url')
                .eq('tracking_id', id)
                .single();
            record = byTrackingId;
        }

        if (!record) {
            console.warn(`[Link Tracker] No record found for id: ${id}`);
            return NextResponse.redirect(DEFAULT_REDIRECT, 302);
        }

        // Update to 'clicked' — always set regardless of current status
        await supabase
            .from('whatsapp_analytics')
            .update({
                status: 'clicked',
                clicked_at: new Date().toISOString(),
            })
            .eq('id', record.id);

        console.log(`[Link Tracker] Click recorded for id: ${id}`);

        const destination = record.destination_url || DEFAULT_REDIRECT;
        return NextResponse.redirect(destination, 302);
    } catch (err: any) {
        console.error(`[Link Tracker] Error for id ${id}:`, err.message);
        return NextResponse.redirect(DEFAULT_REDIRECT, 302);
    }
}
