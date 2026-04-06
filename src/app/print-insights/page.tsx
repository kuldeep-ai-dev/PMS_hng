import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export default async function PrintInsightsPage({
    searchParams,
}: {
    searchParams: Promise<{ range?: string; _token?: string }>;
}) {
    const params = await searchParams;
    const range = (params.range || '7d') as '7d' | '1m' | '2m' | '3m';

    const rangeLabels: Record<string, string> = {
        '7d': 'Last 7 Days',
        '1m': 'Last 1 Month',
        '2m': 'Last 2 Months',
        '3m': 'Last 3 Months',
    };

    const supabase = await createClient();

    // Calculate date cutoff
    const now = new Date();
    switch (range) {
        case '7d': now.setDate(now.getDate() - 7); break;
        case '1m': now.setMonth(now.getMonth() - 1); break;
        case '2m': now.setMonth(now.getMonth() - 2); break;
        case '3m': now.setMonth(now.getMonth() - 3); break;
    }
    const cutoff = now.toISOString();

    const { data: records } = await supabase
        .from('whatsapp_analytics')
        .select('*, bookings(id, check_in_date, check_out_date, rooms(number, type))')
        .gte('sent_at', cutoff)
        .order('sent_at', { ascending: false });

    // Fetch hotel settings
    const { data: settings } = await supabase.from('hotel_settings').select('*').single();
    const hotelName = settings?.hotel_name || 'Hotel';

    const all = records || [];
    const total = all.length;
    const sent = all.filter(r => r.status !== 'failed').length;
    const delivered = all.filter(r => ['delivered', 'read', 'clicked'].includes(r.status)).length;
    const read = all.filter(r => ['read', 'clicked'].includes(r.status)).length;
    const clicked = all.filter(r => r.status === 'clicked').length;
    const failed = all.filter(r => r.status === 'failed').length;
    const checkIns = all.filter(r => r.template_type === 'check_in');
    const checkOuts = all.filter(r => r.template_type === 'check_out');

    const deliveryRate = sent > 0 ? Math.round((delivered / sent) * 100) : 0;
    const readRate = sent > 0 ? Math.round((read / sent) * 100) : 0;
    const ctr = read > 0 ? Math.round((clicked / read) * 100) : 0;

    // Daily breakdown
    const dailyMap: Record<string, { sent: number; delivered: number; read: number; clicked: number }> = {};
    all.forEach(r => {
        const day = new Date(r.sent_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        if (!dailyMap[day]) dailyMap[day] = { sent: 0, delivered: 0, read: 0, clicked: 0 };
        dailyMap[day].sent++;
        if (['delivered', 'read', 'clicked'].includes(r.status)) dailyMap[day].delivered++;
        if (['read', 'clicked'].includes(r.status)) dailyMap[day].read++;
        if (r.status === 'clicked') dailyMap[day].clicked++;
    });

    // Room type analysis
    const roomTypeMap: Record<string, { total: number; reviewed: number }> = {};
    checkOuts.forEach(r => {
        const rType = (r.bookings as any)?.rooms?.type || 'Unknown';
        if (!roomTypeMap[rType]) roomTypeMap[rType] = { total: 0, reviewed: 0 };
        roomTypeMap[rType].total++;
        if (r.status === 'clicked') roomTypeMap[rType].reviewed++;
    });

    // Avg read time
    const readTimes = all.filter(r => r.sent_at && r.read_at).map(r =>
        (new Date(r.read_at).getTime() - new Date(r.sent_at).getTime()) / 60000
    );
    const avgReadTime = readTimes.length > 0 ? Math.round(readTimes.reduce((a, b) => a + b, 0) / readTimes.length) : 0;

    // Peak hours
    const hourMap: Record<number, number> = {};
    all.filter(r => r.read_at).forEach(r => {
        const hour = new Date(r.read_at).getHours();
        hourMap[hour] = (hourMap[hour] || 0) + 1;
    });
    const peakHours = Object.entries(hourMap)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 3)
        .map(([h]) => {
            const hr = parseInt(h);
            return hr === 0 ? '12 AM' : hr < 12 ? `${hr} AM` : hr === 12 ? '12 PM' : `${hr - 12} PM`;
        });

    // Room review list
    const reviewList = checkOuts.map(r => ({
        guest: r.guest_name || 'Unknown',
        phone: r.guest_phone || '—',
        room: (r.bookings as any)?.rooms?.number || '—',
        roomType: (r.bookings as any)?.rooms?.type || '—',
        status: r.status,
        reviewed: r.status === 'clicked',
        sentAt: r.sent_at,
        clickedAt: r.clicked_at,
    }));

    const generatedAt = new Date().toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
    });

    return (
        <html>
            <head>
                <title>WhatsApp Insights Report — {hotelName}</title>
                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Inter', sans-serif; color: #1e293b; background: #fff; padding: 40px; font-size: 13px; line-height: 1.6; }
                    .header { text-align: center; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 3px solid #0d9488; }
                    .header h1 { font-size: 24px; font-weight: 900; color: #0f172a; margin-bottom: 4px; }
                    .header .subtitle { font-size: 13px; color: #64748b; }
                    .header .period { display: inline-block; background: #f0fdfa; color: #0d9488; font-weight: 700; font-size: 11px; padding: 4px 12px; border-radius: 20px; margin-top: 8px; border: 1px solid #99f6e4; }
                    .section { margin-bottom: 28px; }
                    .section-title { font-size: 15px; font-weight: 800; color: #0f172a; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0; display: flex; align-items: center; gap: 8px; }
                    .section-title .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
                    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
                    .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; text-align: center; }
                    .kpi-card .label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; color: #94a3b8; margin-bottom: 4px; }
                    .kpi-card .value { font-size: 32px; font-weight: 900; }
                    .kpi-card .suffix { font-size: 16px; font-weight: 700; }
                    .green { color: #059669; }
                    .purple { color: #7c3aed; }
                    .amber { color: #d97706; }
                    .blue { color: #2563eb; }
                    .red { color: #dc2626; }
                    .gray { color: #475569; }
                    table { width: 100%; border-collapse: collapse; font-size: 12px; }
                    th { background: #f1f5f9; font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; text-align: left; padding: 8px 12px; border-bottom: 2px solid #e2e8f0; }
                    td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; }
                    tr:nth-child(even) { background: #fafafa; }
                    .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
                    .badge-green { background: #dcfce7; color: #16a34a; }
                    .badge-gray { background: #f1f5f9; color: #94a3b8; }
                    .badge-blue { background: #dbeafe; color: #2563eb; }
                    .badge-amber { background: #fef3c7; color: #d97706; }
                    .badge-purple { background: #ede9fe; color: #7c3aed; }
                    .badge-red { background: #fef2f2; color: #dc2626; }
                    .insights-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
                    .insight-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; }
                    .insight-box .title { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; color: #94a3b8; margin-bottom: 6px; }
                    .insight-box .data { font-size: 18px; font-weight: 900; color: #0f172a; }
                    .insight-box .sub { font-size: 11px; color: #64748b; margin-top: 2px; }
                    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 10px; color: #94a3b8; }
                    @media print { body { padding: 20px; } @page { margin: 15mm; size: A4; } }
                `}</style>
            </head>
            <body>
                <div className="header">
                    <h1>📊 WhatsApp Insights Report</h1>
                    <p className="subtitle">{hotelName}</p>
                    <div className="period">{rangeLabels[range]} • Generated: {generatedAt}</div>
                </div>

                {/* KPI Cards */}
                <div className="kpi-grid">
                    <div className="kpi-card">
                        <div className="label">Total Messages</div>
                        <div className="value gray">{total}</div>
                    </div>
                    <div className="kpi-card">
                        <div className="label">Delivery Rate</div>
                        <div className="value green">{deliveryRate}<span className="suffix">%</span></div>
                    </div>
                    <div className="kpi-card">
                        <div className="label">Read / Open Rate</div>
                        <div className="value purple">{readRate}<span className="suffix">%</span></div>
                    </div>
                    <div className="kpi-card">
                        <div className="label">Click-Through Rate</div>
                        <div className="value amber">{ctr}<span className="suffix">%</span></div>
                    </div>
                </div>

                {/* Engagement Patterns */}
                <div className="section">
                    <div className="section-title"><span className="dot" style={{ background: '#7c3aed' }} /> Customer Engagement Patterns</div>
                    <div className="insights-grid">
                        <div className="insight-box">
                            <div className="title">Avg. Time to Read</div>
                            <div className="data">{avgReadTime} min</div>
                            <div className="sub">From sent → opened by guest</div>
                        </div>
                        <div className="insight-box">
                            <div className="title">Peak Read Hours</div>
                            <div className="data">{peakHours.length > 0 ? peakHours.join(', ') : 'N/A'}</div>
                            <div className="sub">When guests most engage with messages</div>
                        </div>
                        <div className="insight-box">
                            <div className="title">Check-In Messages</div>
                            <div className="data blue">{checkIns.length}</div>
                        </div>
                        <div className="insight-box">
                            <div className="title">Check-Out Messages</div>
                            <div className="data amber">{checkOuts.length}</div>
                        </div>
                    </div>
                </div>

                {/* Message Breakdown */}
                <div className="section">
                    <div className="section-title"><span className="dot" style={{ background: '#2563eb' }} /> Message Status Breakdown</div>
                    <table>
                        <thead>
                            <tr>
                                <th>Status</th>
                                <th>Count</th>
                                <th>% of Sent</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td><span className="badge badge-blue">Sent</span></td><td>{sent}</td><td>—</td></tr>
                            <tr><td><span className="badge badge-green">Delivered</span></td><td>{delivered}</td><td>{deliveryRate}%</td></tr>
                            <tr><td><span className="badge badge-purple">Read</span></td><td>{read}</td><td>{readRate}%</td></tr>
                            <tr><td><span className="badge badge-amber">Clicked</span></td><td>{clicked}</td><td>{ctr}% of read</td></tr>
                            {failed > 0 && <tr><td><span className="badge badge-red">Failed</span></td><td>{failed}</td><td>{total > 0 ? Math.round((failed / total) * 100) : 0}%</td></tr>}
                        </tbody>
                    </table>
                </div>

                {/* Daily Breakdown */}
                {Object.keys(dailyMap).length > 0 && (
                    <div className="section">
                        <div className="section-title"><span className="dot" style={{ background: '#059669' }} /> Daily Breakdown</div>
                        <table>
                            <thead>
                                <tr><th>Date</th><th>Sent</th><th>Delivered</th><th>Read</th><th>Clicked</th></tr>
                            </thead>
                            <tbody>
                                {Object.entries(dailyMap).map(([day, d]) => (
                                    <tr key={day}>
                                        <td style={{ fontWeight: 600 }}>{day}</td>
                                        <td>{d.sent}</td>
                                        <td>{d.delivered}</td>
                                        <td>{d.read}</td>
                                        <td>{d.clicked}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Room Type Analysis */}
                {Object.keys(roomTypeMap).length > 0 && (
                    <div className="section">
                        <div className="section-title"><span className="dot" style={{ background: '#d97706' }} /> Room Type Review Analysis</div>
                        <table>
                            <thead>
                                <tr><th>Room Type</th><th>Messages Sent</th><th>Reviews (Clicked)</th><th>Review Rate</th></tr>
                            </thead>
                            <tbody>
                                {Object.entries(roomTypeMap).map(([type, d]) => (
                                    <tr key={type}>
                                        <td style={{ fontWeight: 600 }}>{type}</td>
                                        <td>{d.total}</td>
                                        <td>{d.reviewed}</td>
                                        <td><span className={`badge ${d.total > 0 && d.reviewed / d.total >= 0.5 ? 'badge-green' : 'badge-gray'}`}>{d.total > 0 ? Math.round((d.reviewed / d.total) * 100) : 0}%</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Room Review Details */}
                {reviewList.length > 0 && (
                    <div className="section">
                        <div className="section-title"><span className="dot" style={{ background: '#eab308' }} /> Room Review Tracker — Checkout Guests</div>
                        <table>
                            <thead>
                                <tr><th>Guest</th><th>Phone</th><th>Room</th><th>Type</th><th>Status</th><th>Reviewed?</th></tr>
                            </thead>
                            <tbody>
                                {reviewList.map((r, i) => (
                                    <tr key={i}>
                                        <td style={{ fontWeight: 600 }}>{r.guest}</td>
                                        <td>{r.phone}</td>
                                        <td>{r.room}</td>
                                        <td>{r.roomType}</td>
                                        <td><span className={`badge badge-${r.status === 'clicked' ? 'amber' : r.status === 'read' ? 'purple' : r.status === 'delivered' ? 'green' : r.status === 'failed' ? 'red' : 'blue'}`}>{r.status}</span></td>
                                        <td>{r.reviewed ? '✅ Yes' : '❌ No'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* All Messages */}
                <div className="section">
                    <div className="section-title"><span className="dot" style={{ background: '#0d9488' }} /> Full Message Log</div>
                    <table>
                        <thead>
                            <tr><th>Guest</th><th>Phone</th><th>Room</th><th>Type</th><th>Status</th><th>Sent</th></tr>
                        </thead>
                        <tbody>
                            {all.map((r, i) => (
                                <tr key={i}>
                                    <td style={{ fontWeight: 600 }}>{r.guest_name || '—'}</td>
                                    <td>{r.guest_phone || '—'}</td>
                                    <td>{(r.bookings as any)?.rooms?.number || '—'}</td>
                                    <td>{r.template_type === 'check_in' ? 'Check-In' : 'Check-Out'}</td>
                                    <td><span className={`badge badge-${r.status === 'clicked' ? 'amber' : r.status === 'read' ? 'purple' : r.status === 'delivered' ? 'green' : r.status === 'failed' ? 'red' : 'blue'}`}>{r.status}</span></td>
                                    <td>{new Date(r.sent_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="footer">
                    <p>Generated by <strong>Geny PMS Pro Plus</strong> — WhatsApp Analytics Engine</p>
                    <p>This report is confidential and intended for internal hotel management use only.</p>
                </div>
            </body>
        </html>
    );
}
