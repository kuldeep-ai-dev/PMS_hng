'use server';

import { createClient } from '@/utils/supabase/server';

type DateRange = '7d' | '1m' | '2m' | '3m';

function getDateCutoff(range: DateRange): string {
    const now = new Date();
    switch (range) {
        case '7d': now.setDate(now.getDate() - 7); break;
        case '1m': now.setMonth(now.getMonth() - 1); break;
        case '2m': now.setMonth(now.getMonth() - 2); break;
        case '3m': now.setMonth(now.getMonth() - 3); break;
    }
    return now.toISOString();
}

export async function getWhatsAppAnalytics(range: DateRange = '7d') {
    const supabase = await createClient();
    const cutoff = getDateCutoff(range);

    // Fetch records within the date range, with booking + room data
    const { data: records, error } = await supabase
        .from('whatsapp_analytics')
        .select('*, bookings(id, room_id, check_in_date, check_out_date, rooms(number, type))')
        .gte('sent_at', cutoff)
        .order('sent_at', { ascending: false });

    if (error) {
        console.error('[WA Analytics] Query error:', error.message);
        return { stats: null, timeline: [], roomReviews: [] };
    }

    const all = records || [];

    // Split records by module
    const hotelRecords = all.filter((r: any) => ['check_in', 'check_out', 'test'].includes(r.template_type));
    const restaurantRecords = all.filter((r: any) => r.template_type === 'restaurant_order');

    const calculateStats = (records: any[]) => {
        const total = records.length;
        const sent = records.filter(r => r.status !== 'failed').length;
        const delivered = records.filter(r => ['delivered', 'read', 'clicked'].includes(r.status)).length;
        const read = records.filter(r => ['read', 'clicked'].includes(r.status)).length;
        const failed = records.filter(r => r.status === 'failed').length;

        // Find counts by template type
        const checkInCount = records.filter(r => r.template_type === 'check_in').length;
        const checkOutCount = records.filter(r => r.template_type === 'check_out').length;

        // CTR only if message has a link (checkout or restaurant order with link)
        const linkEnabledMessages = records.filter(r => ['check_out', 'restaurant_order'].includes(r.template_type));
        const linkRead = linkEnabledMessages.filter(r => ['read', 'clicked'].includes(r.status)).length;
        const clicked = linkEnabledMessages.filter(r => r.status === 'clicked').length;

        return {
            total,
            sent,
            delivered,
            read,
            clicked,
            failed,
            checkInCount,
            checkOutCount,
            linkRead,
            deliveryRate: sent > 0 ? Math.round((delivered / sent) * 100) : 0,
            readRate: sent > 0 ? Math.round((read / sent) * 100) : 0,
            ctr: linkRead > 0 ? Math.round((clicked / linkRead) * 100) : 0,
        };
    };

    const hotelStats = calculateStats(hotelRecords);
    const restaurantStats = calculateStats(restaurantRecords);

    // Timeline mapping
    const mapTimeline = (records: any[]) => records.map((r: any) => ({
        id: r.id,
        wamid: r.wamid,
        guestName: r.guest_name || 'Unknown',
        guestPhone: r.guest_phone || '',
        status: r.status,
        templateType: r.template_type,
        sentAt: r.sent_at,
        deliveredAt: r.delivered_at,
        readAt: r.read_at,
        clickedAt: r.clicked_at,
        roomNumber: (r.bookings as any)?.rooms?.number || null,
        roomType: (r.bookings as any)?.rooms?.type || null,
    }));

    const hotelTimeline = mapTimeline(hotelRecords);
    const restaurantTimeline = mapTimeline(restaurantRecords);

    // Room reviews only for hotel checkout
    const hotelCheckoutOnly = hotelRecords.filter(r => r.template_type === 'check_out');
    const roomReviews = hotelCheckoutOnly.map(r => ({
        id: r.id,
        guestName: r.guest_name || 'Unknown',
        guestPhone: r.guest_phone || '',
        roomNumber: (r.bookings as any)?.rooms?.number || '—',
        roomType: (r.bookings as any)?.rooms?.type || '',
        status: r.status,
        reviewed: r.status === 'clicked',
        sentAt: r.sent_at,
        clickedAt: r.clicked_at,
        checkOutDate: (r.bookings as any)?.check_out_date || null,
    }));

    return {
        hotel: { stats: hotelStats, timeline: hotelTimeline, roomReviews },
        restaurant: { stats: restaurantStats, timeline: restaurantTimeline, roomReviews: [] }
    };
}

/**
 * Cleanup old analytics data (older than 3 months)
 */
export async function cleanupOldAnalytics() {
    const supabase = await createClient();
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 3);

    const { data, error } = await supabase
        .from('whatsapp_analytics')
        .delete()
        .lt('sent_at', cutoff.toISOString())
        .select('id');

    if (error) {
        console.error('[WA Analytics] Cleanup error:', error.message);
        return { deleted: 0, error: error.message };
    }

    return { deleted: data?.length || 0 };
}

/**
 * Export advanced insight data for customer pattern analysis
 */
export async function exportInsightsData(range: DateRange = '3m') {
    const supabase = await createClient();
    const cutoff = getDateCutoff(range);

    const { data: records, error } = await supabase
        .from('whatsapp_analytics')
        .select('*, bookings(id, room_id, check_in_date, check_out_date, rooms(number, type))')
        .gte('sent_at', cutoff)
        .order('sent_at', { ascending: false });

    if (error) {
        console.error('[WA Export] Query error:', error.message);
        return { success: false, error: error.message, data: null };
    }

    if (!records || records.length === 0) {
        console.log('[WA Export] No records found for range:', range);
        return { success: true, data: { generatedAt: new Date().toISOString(), period: range, summary: { totalMessages: 0 }, message: 'No data available for this period.' } };
    }

    const all = records || [];
    const total = all.length;
    const sent = all.filter(r => r.status !== 'failed').length;
    const delivered = all.filter(r => ['delivered', 'read', 'clicked'].includes(r.status)).length;
    const read = all.filter(r => ['read', 'clicked'].includes(r.status)).length;
    const clicked = all.filter(r => r.status === 'clicked').length;
    const failed = all.filter(r => r.status === 'failed').length;

    const checkIns = all.filter(r => r.template_type === 'check_in');
    const checkOuts = all.filter(r => r.template_type === 'check_out');

    // Group by day
    const dailyBreakdown: Record<string, { sent: number; delivered: number; read: number; clicked: number }> = {};
    all.forEach(r => {
        const day = new Date(r.sent_at).toISOString().split('T')[0];
        if (!dailyBreakdown[day]) dailyBreakdown[day] = { sent: 0, delivered: 0, read: 0, clicked: 0 };
        dailyBreakdown[day].sent++;
        if (['delivered', 'read', 'clicked'].includes(r.status)) dailyBreakdown[day].delivered++;
        if (['read', 'clicked'].includes(r.status)) dailyBreakdown[day].read++;
        if (r.status === 'clicked') dailyBreakdown[day].clicked++;
    });

    // Room-type breakdown
    const roomTypeStats: Record<string, { total: number; reviewed: number }> = {};
    checkOuts.forEach(r => {
        const rType = (r.bookings as any)?.rooms?.type || 'Unknown';
        if (!roomTypeStats[rType]) roomTypeStats[rType] = { total: 0, reviewed: 0 };
        roomTypeStats[rType].total++;
        if (r.status === 'clicked') roomTypeStats[rType].reviewed++;
    });

    // Peak engagement hours
    const hourlyEngagement: Record<number, number> = {};
    all.filter(r => r.read_at).forEach(r => {
        const hour = new Date(r.read_at).getHours();
        hourlyEngagement[hour] = (hourlyEngagement[hour] || 0) + 1;
    });

    // Average response times
    const readTimes = all.filter(r => r.sent_at && r.read_at).map(r => {
        return (new Date(r.read_at).getTime() - new Date(r.sent_at).getTime()) / 60000; // in minutes
    });
    const avgReadTime = readTimes.length > 0 ? Math.round(readTimes.reduce((a, b) => a + b, 0) / readTimes.length) : 0;

    const clickTimes = all.filter(r => r.read_at && r.clicked_at).map(r => {
        return (new Date(r.clicked_at).getTime() - new Date(r.read_at).getTime()) / 60000;
    });
    const avgClickTime = clickTimes.length > 0 ? Math.round(clickTimes.reduce((a, b) => a + b, 0) / clickTimes.length) : 0;

    const report = {
        generatedAt: new Date().toISOString(),
        period: range,
        summary: {
            totalMessages: total,
            sent,
            delivered,
            read,
            clicked,
            failed,
            deliveryRate: sent > 0 ? `${Math.round((delivered / sent) * 100)}%` : '0%',
            readRate: sent > 0 ? `${Math.round((read / sent) * 100)}%` : '0%',
            clickThroughRate: read > 0 ? `${Math.round((clicked / read) * 100)}%` : '0%',
            checkInMessages: checkIns.length,
            checkOutMessages: checkOuts.length,
        },
        engagementPatterns: {
            avgTimeToRead: `${avgReadTime} minutes`,
            avgTimeToClick: `${avgClickTime} minutes`,
            peakReadHours: Object.entries(hourlyEngagement)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([h, c]) => ({ hour: `${h}:00`, reads: c })),
        },
        dailyBreakdown: Object.entries(dailyBreakdown)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, data]) => ({ date, ...data })),
        roomTypeAnalysis: Object.entries(roomTypeStats).map(([type, data]) => ({
            roomType: type,
            totalMessages: data.total,
            reviewed: data.reviewed,
            reviewRate: data.total > 0 ? `${Math.round((data.reviewed / data.total) * 100)}%` : '0%',
        })),
        guestDetails: all.map(r => ({
            guest: r.guest_name,
            phone: r.guest_phone,
            room: (r.bookings as any)?.rooms?.number || '—',
            roomType: (r.bookings as any)?.rooms?.type || '—',
            type: r.template_type,
            status: r.status,
            sentAt: r.sent_at,
            readAt: r.read_at,
            clickedAt: r.clicked_at,
        })),
    };

    return { success: true, data: report };
}
