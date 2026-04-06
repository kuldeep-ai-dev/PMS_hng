import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role for webhook processing (no user session)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Status hierarchy for idempotent updates
const STATUS_RANK: Record<string, number> = {
    'failed': 0,
    'sent': 1,
    'delivered': 2,
    'read': 3,
    'clicked': 4,
};

/**
 * GET: Meta Webhook Verification (Challenge/Verify handshake)
 * Meta requires: 200 status + challenge value as plain text integer
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'geny_pms_wa_verify_2026';

    console.log('[WA Webhook] Verification attempt:', { mode, tokenMatch: token === verifyToken, challenge });

    if (mode === 'subscribe' && token === verifyToken) {
        console.log('[WA Webhook] ✅ Verification successful, returning challenge:', challenge);
        // Meta requires the challenge returned as plain text with integer content
        return new Response(challenge, {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
        });
    }

    console.warn('[WA Webhook] ❌ Verification failed. mode:', mode, 'token match:', token === verifyToken);
    return new Response('Forbidden', { status: 403 });
}

/**
 * POST: Process incoming WhatsApp status updates from Meta
 * Handles: sent, delivered, read, failed
 * Uses idempotent logic to prevent out-of-order overwrites
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Extract status updates from the webhook payload
        const entries = body?.entry || [];

        for (const entry of entries) {
            const changes = entry?.changes || [];

            for (const change of changes) {
                const statuses = change?.value?.statuses || [];

                for (const statusUpdate of statuses) {
                    const wamid = statusUpdate.id;
                    const newStatus = statusUpdate.status; // sent, delivered, read, failed
                    const timestamp = statusUpdate.timestamp
                        ? new Date(parseInt(statusUpdate.timestamp) * 1000).toISOString()
                        : new Date().toISOString();

                    if (!wamid || !newStatus) continue;

                    // Map Meta status names to our schema
                    const mappedStatus = newStatus === 'sent' ? 'sent'
                        : newStatus === 'delivered' ? 'delivered'
                            : newStatus === 'read' ? 'read'
                                : newStatus === 'failed' ? 'failed'
                                    : null;

                    if (!mappedStatus) continue;

                    // Fetch current record
                    const { data: existing } = await supabase
                        .from('whatsapp_analytics')
                        .select('id, status')
                        .eq('wamid', wamid)
                        .single();

                    if (!existing) {
                        console.log(`[WA Webhook] No record found for wamid: ${wamid}`);
                        continue;
                    }

                    // Idempotent: Only update if new status is higher in hierarchy
                    const currentRank = STATUS_RANK[existing.status] ?? 0;
                    const newRank = STATUS_RANK[mappedStatus] ?? 0;

                    if (newRank <= currentRank) {
                        console.log(`[WA Webhook] Skipping ${mappedStatus} (rank ${newRank}) for ${wamid}, current: ${existing.status} (rank ${currentRank})`);
                        continue;
                    }

                    // Build update payload
                    const updatePayload: Record<string, any> = { status: mappedStatus };
                    if (mappedStatus === 'delivered') updatePayload.delivered_at = timestamp;
                    if (mappedStatus === 'read') updatePayload.read_at = timestamp;

                    const { error } = await supabase
                        .from('whatsapp_analytics')
                        .update(updatePayload)
                        .eq('id', existing.id);

                    if (error) {
                        console.error(`[WA Webhook] Update error for ${wamid}:`, error.message);
                    } else {
                        console.log(`[WA Webhook] Updated ${wamid} → ${mappedStatus}`);
                    }
                }
            }
        }

        // Always return 200 to Meta to acknowledge receipt
        return NextResponse.json({ status: 'ok' }, { status: 200 });
    } catch (err: any) {
        console.error('[WA Webhook] Processing error:', err.message);
        // Still return 200 to prevent Meta from retrying
        return NextResponse.json({ status: 'error', message: err.message }, { status: 200 });
    }
}
