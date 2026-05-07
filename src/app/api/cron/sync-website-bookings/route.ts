import { NextResponse } from 'next/server';
import { syncBookingsFromWebsite } from '@/app/actions/sync-bookings';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        const result = await syncBookingsFromWebsite();
        return NextResponse.json({
            timestamp: new Date().toISOString(),
            ...result
        });
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
