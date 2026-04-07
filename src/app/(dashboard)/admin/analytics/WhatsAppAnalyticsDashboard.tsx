'use client';

import { BentoCard } from '@/components/ui/BentoCard';
import {
    MessageCircle, Send, CheckCheck, Eye, MousePointerClick,
    AlertTriangle, Clock, Phone, BarChart3, Zap, Activity,
    Star, BedDouble, ThumbsUp, ThumbsDown, Download, Trash2, CalendarDays, UtensilsCrossed
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { useState, useTransition, useEffect, useCallback } from 'react';
import { getWhatsAppAnalytics, cleanupOldAnalytics } from './actions-wa-analytics';

type DateRange = '7d' | '1m' | '2m' | '3m';

interface TimelineItem {
    id: string;
    wamid: string;
    guestName: string;
    guestPhone: string;
    status: string;
    templateType: string;
    sentAt: string;
    deliveredAt: string | null;
    readAt: string | null;
    clickedAt: string | null;
    roomNumber: string | null;
    roomType: string | null;
}

interface RoomReview {
    id: string;
    guestName: string;
    guestPhone: string;
    roomNumber: string;
    roomType: string;
    status: string;
    reviewed: boolean;
    sentAt: string;
    clickedAt: string | null;
    checkOutDate: string | null;
}

interface Stats {
    total: number;
    sent: number;
    delivered: number;
    read: number;
    clicked: number;
    failed: number;
    checkInCount: number;
    checkOutCount: number;
    checkoutRead: number;
    deliveryRate: number;
    readRate: number;
    ctr: number;
}

interface Props {
    data: {
        hotel: { stats: Stats; timeline: TimelineItem[]; roomReviews: RoomReview[] };
        restaurant: { stats: Stats; timeline: TimelineItem[]; roomReviews: any[] };
    } | null;
}

const statusConfig: Record<string, { icon: any; label: string; color: string; bg: string; border: string }> = {
    sent: { icon: Send, label: 'Sent', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
    delivered: { icon: CheckCheck, label: 'Delivered', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    read: { icon: Eye, label: 'Read', color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200' },
    clicked: { icon: MousePointerClick, label: 'Clicked', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
    failed: { icon: AlertTriangle, label: 'Failed', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
};

const rangeLabels: Record<DateRange, string> = {
    '7d': 'This Week',
    '1m': '1 Month',
    '2m': '2 Months',
    '3m': '3 Months',
};

function KPICard({ icon: Icon, label, value, suffix, color, gradient }: {
    icon: any; label: string; value: number | string; suffix?: string; color: string; gradient: string;
}) {
    return (
        <BentoCard className="p-5 relative overflow-hidden group hover:shadow-xl transition-all duration-500">
            <div className={cn("absolute top-0 right-0 w-32 h-32 rounded-full opacity-[0.07] -translate-y-8 translate-x-8 transition-transform duration-500 group-hover:scale-125", gradient)} />
            <div className="flex items-start justify-between relative z-10">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">{label}</p>
                    <div className="flex items-baseline gap-1.5">
                        <p className={cn("text-4xl font-black tracking-tight", color)}>{value}</p>
                        {suffix && <span className={cn("text-lg font-bold", color)}>{suffix}</span>}
                    </div>
                </div>
                <div className={cn("p-2.5 rounded-xl", color.replace('text-', 'bg-').replace('-600', '-100').replace('-500', '-100'))}>
                    <Icon className={cn("w-5 h-5", color)} />
                </div>
            </div>
        </BentoCard>
    );
}

function StatusPill({ status }: { status: string }) {
    const config = statusConfig[status] || statusConfig.sent;
    const Icon = config.icon;
    return (
        <span className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
            config.bg, config.color, config.border
        )}>
            <Icon className="w-3 h-3" />
            {config.label}
        </span>
    );
}

const barColors: Record<string, string> = {
    'text-blue-500': '#3b82f6',
    'text-emerald-500': '#10b981',
    'text-violet-500': '#8b5cf6',
    'text-amber-500': '#f59e0b',
    'text-red-500': '#ef4444',
};

function ProgressBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    const barWidth = pct > 0 ? Math.max(pct, 4) : 0;
    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">{label}</span>
                <span className={cn("text-xs font-black", color)}>{value} / {total} ({pct}%)</span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full"
                    style={{
                        width: `${barWidth}%`,
                        backgroundColor: barColors[color] || '#94a3b8',
                        transition: 'width 0.8s ease-out',
                    }}
                />
            </div>
        </div>
    );
}

export function WhatsAppAnalyticsDashboard({ data: initialData }: Props) {
    const [view, setView] = useState<'hotel' | 'restaurant'>('hotel');
    const [data, setData] = useState(initialData);
    const [selectedRange, setSelectedRange] = useState<DateRange>('7d');
    const [isPending, startTransition] = useTransition();
    const [exportPending, setExportPending] = useState(false);

    // Current view data
    const activeData = data ? (view === 'hotel' ? data.hotel : data.restaurant) : null;
    const stats = activeData?.stats;
    const timeline = activeData?.timeline || [];
    const roomReviews = activeData?.roomReviews || [];

    const refreshData = useCallback(async (range: DateRange) => {
        const newData = await getWhatsAppAnalytics(range);
        setData(newData as any);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            refreshData(selectedRange);
        }, 15000);
        return () => clearInterval(interval);
    }, [selectedRange, refreshData]);

    const handleRangeChange = (range: DateRange) => {
        setSelectedRange(range);
        startTransition(async () => {
            await refreshData(range);
        });
    };

    const handleExport = async () => {
        setExportPending(true);
        try {
            const response = await fetch(`/api/export-insights?range=${selectedRange}`);
            if (!response.ok) {
                const err = await response.json();
                alert(`Export failed: ${err.error || 'Unknown error'}`);
                setExportPending(false);
                return;
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            const rangeLabel: Record<string, string> = { '7d': '7Days', '1m': '1Month', '2m': '2Months', '3m': '3Months' };
            a.download = `WhatsApp_Insights_${rangeLabel[selectedRange] || selectedRange}_${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }, 100);
        } catch (e: any) {
            console.error('Export failed:', e);
            alert(`Export failed: ${e.message}`);
        }
        setExportPending(false);
    };

    const handleCleanup = async () => {
        if (!confirm('This will permanently delete all WhatsApp analytics data older than 3 months. Continue?')) return;
        startTransition(async () => {
            const result = await cleanupOldAnalytics();
            alert(`Cleanup complete. ${result.deleted} old records removed.`);
            await refreshData(selectedRange);
        });
    };

    if (!data || !activeData) {
        return (
            <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-10">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">WhatsApp Insights</h1>
                    <p className="text-sm text-slate-500 mt-1">Initializing analytics engine...</p>
                </div>
                <BentoCard className="p-12 text-center">
                    <Activity className="w-12 h-12 text-slate-300 mx-auto mb-4 animate-spin" />
                    <p className="text-slate-400 font-medium">Gathering real-time insights...</p>
                </BentoCard>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-10">
            {/* Header + Controls */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    {/* View Switcher Tabs */}
                    <div className="flex h-10 w-fit p-1 bg-slate-100 rounded-xl mb-4">
                        <button
                            onClick={() => setView('hotel')}
                            className={cn(
                                "px-6 rounded-lg text-xs font-black transition-all",
                                view === 'hotel'
                                    ? "bg-white text-slate-900 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            HOTEL
                        </button>
                        <button
                            onClick={() => setView('restaurant')}
                            className={cn(
                                "px-6 rounded-lg text-xs font-black transition-all",
                                view === 'restaurant'
                                    ? "bg-white text-slate-900 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            RESTAURANT
                        </button>
                    </div>

                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-xl">
                            <MessageCircle className="w-6 h-6 text-green-600" />
                        </div>
                        {view === 'hotel' ? 'Hotel' : 'Restaurant'} WhatsApp Insights
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Real-time delivery, read receipts, and click-through analytics.</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Date Range Selector */}
                    <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                        {(Object.keys(rangeLabels) as DateRange[]).map((range) => (
                            <button
                                key={range}
                                onClick={() => handleRangeChange(range)}
                                disabled={isPending}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                    selectedRange === range
                                        ? "bg-teal-500 text-white shadow-sm shadow-teal-200"
                                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                                )}
                            >
                                {rangeLabels[range]}
                            </button>
                        ))}
                    </div>
                    {/* Export Button */}
                    <button
                        onClick={handleExport}
                        disabled={exportPending}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200 disabled:opacity-50"
                    >
                        <Download className="w-4 h-4" />
                        {exportPending ? 'Exporting...' : 'Export Insights'}
                    </button>
                    {/* Cleanup Button */}
                    <button
                        onClick={handleCleanup}
                        disabled={isPending}
                        className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 text-xs font-bold rounded-xl hover:bg-red-100 transition-all border border-red-200 disabled:opacity-50"
                        title="Delete analytics data older than 3 months"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Activity className="w-4 h-4 animate-pulse text-green-500" />
                        <span className="font-bold">Live</span>
                    </div>
                </div>
            </div>

            {/* Loading Overlay */}
            {isPending && (
                <div className="text-center py-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-700 rounded-full text-xs font-bold">
                        <Activity className="w-4 h-4 animate-spin" />
                        Loading {rangeLabels[selectedRange]} data...
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard icon={Send} label="Total Messages" value={stats!.total} color="text-slate-700" gradient="bg-slate-400" />
                <KPICard icon={CheckCheck} label="Delivery Rate" value={stats!.deliveryRate} suffix="%" color="text-emerald-600" gradient="bg-emerald-400" />
                <KPICard icon={Eye} label="Read / Open Rate" value={stats!.readRate} suffix="%" color="text-violet-600" gradient="bg-violet-400" />
                <KPICard icon={MousePointerClick} label="Click-Through Rate" value={stats!.ctr} suffix="%" color="text-amber-500" gradient="bg-amber-400" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Funnel Breakdown */}
                <BentoCard className="p-6 lg:col-span-1">
                    <div className="flex items-center gap-2 mb-6">
                        <BarChart3 className="w-5 h-5 text-indigo-600" />
                        <h2 className="font-bold text-slate-800">Delivery Funnel</h2>
                    </div>
                    <div className="space-y-4">
                        <ProgressBar label="Sent" value={stats!.sent} total={stats!.total} color="text-blue-500" />
                        <ProgressBar label="Delivered" value={stats!.delivered} total={stats!.sent} color="text-emerald-500" />
                        <ProgressBar label="Read" value={stats!.read} total={stats!.sent} color="text-violet-500" />
                        <ProgressBar label="Clicked (Links)" value={stats!.clicked} total={(stats! as any).linkRead || 0} color="text-amber-500" />
                        {stats!.failed > 0 && (
                            <ProgressBar label="Failed" value={stats!.failed} total={stats!.total} color="text-red-500" />
                        )}
                    </div>
                    {view === 'hotel' && (
                        <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
                            <div className="p-3 bg-blue-50 rounded-xl text-center">
                                <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">Check-In</p>
                                <p className="text-2xl font-black text-blue-600">{stats!.checkInCount}</p>
                            </div>
                            <div className="p-3 bg-orange-50 rounded-xl text-center">
                                <p className="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-1">Check-Out</p>
                                <p className="text-2xl font-black text-orange-600">{stats!.checkOutCount}</p>
                            </div>
                        </div>
                    )}
                    {view === 'restaurant' && (
                        <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
                            <div className="p-3 bg-amber-50 rounded-xl text-center border border-amber-100">
                                <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1">Restaurant Orders</p>
                                <p className="text-2xl font-black text-amber-600">{stats!.total}</p>
                            </div>
                            <div className="p-3 bg-green-50 rounded-xl text-center border border-green-100">
                                <p className="text-[10px] font-black uppercase tracking-widest text-green-500 mb-1">CTR</p>
                                <p className="text-2xl font-black text-green-600">{stats!.ctr}%</p>
                            </div>
                        </div>
                    )}
                </BentoCard>

                {/* Right: Status Timeline — scrollable after 5 entries */}
                <BentoCard className="p-6 lg:col-span-2">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-slate-600" />
                            <h2 className="font-bold text-slate-800">Message Timeline</h2>
                        </div>
                        <span className="text-xs text-slate-400 font-bold">{timeline.length} messages</span>
                    </div>
                    {timeline.length === 0 ? (
                        <div className="py-12 text-center">
                            <MessageCircle className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                            <p className="text-slate-400 text-sm">No messages in this period.</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                            {timeline.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between p-4 bg-slate-50/80 rounded-xl border border-slate-100 hover:border-slate-200 transition-all group"
                                >
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0",
                                            item.templateType === 'check_in'
                                                ? 'bg-blue-100 text-blue-600'
                                                : item.templateType === 'check_out'
                                                    ? 'bg-orange-100 text-orange-600'
                                                    : 'bg-slate-100 text-slate-500'
                                        )}>
                                            {item.guestName.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-slate-800 text-sm truncate">{item.guestName}</p>
                                            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                                                {item.roomNumber && (
                                                    <>
                                                        <span className="flex items-center gap-1">
                                                            <BedDouble className="w-3 h-3" />
                                                            Room {item.roomNumber}
                                                        </span>
                                                        <span>•</span>
                                                    </>
                                                )}
                                                <span className="flex items-center gap-1">
                                                    <Phone className="w-3 h-3" />
                                                    {item.guestPhone}
                                                </span>
                                                <span>•</span>
                                                <span className="capitalize">{item.templateType.replace('_', ' ')}</span>
                                                <span>•</span>
                                                <span>{item.sentAt ? formatDistanceToNow(new Date(item.sentAt), { addSuffix: true }) : ''}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <StatusPill status={item.status} />
                                        {item.readAt && (
                                            <span className="text-[10px] text-violet-500 font-bold hidden lg:block">
                                                Read {format(new Date(item.readAt), 'h:mm a')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </BentoCard>
            </div>

            {/* Room Review Tracker — scrollable after 6 entries */}
            {view === 'hotel' && roomReviews.length > 0 && (
                <BentoCard className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <Star className="w-5 h-5 text-yellow-500" />
                            <h2 className="font-bold text-slate-800">Room Review Tracker</h2>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                            <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
                                <ThumbsUp className="w-3.5 h-3.5" />
                                {roomReviews.filter(r => r.reviewed).length} Reviewed
                            </span>
                            <span className="flex items-center gap-1.5 text-slate-400 font-bold">
                                <ThumbsDown className="w-3.5 h-3.5" />
                                {roomReviews.filter(r => !r.reviewed).length} Pending
                            </span>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
                        {roomReviews.map((review) => (
                            <div
                                key={review.id}
                                className={cn(
                                    "p-4 rounded-xl border transition-all",
                                    review.reviewed
                                        ? "bg-emerald-50/50 border-emerald-200"
                                        : "bg-slate-50/50 border-slate-200"
                                )}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black",
                                            review.reviewed
                                                ? "bg-emerald-100 text-emerald-700"
                                                : "bg-slate-100 text-slate-500"
                                        )}>
                                            {review.roomNumber}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">{review.guestName}</p>
                                            <p className="text-[10px] text-slate-400">{review.roomType}</p>
                                        </div>
                                    </div>
                                    {review.reviewed ? (
                                        <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
                                            <Star className="w-3 h-3 fill-emerald-500" /> Reviewed
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                                            <Clock className="w-3 h-3" /> Pending
                                        </span>
                                    )}
                                </div>
                                <div className="text-[11px] text-slate-400 mt-1">
                                    {review.checkOutDate && (
                                        <span>Checked out: {format(new Date(review.checkOutDate), 'dd MMM yyyy')}</span>
                                    )}
                                    {review.clickedAt && (
                                        <span className="ml-2 text-emerald-500 font-bold">
                                            • Clicked {format(new Date(review.clickedAt), 'dd MMM, h:mm a')}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </BentoCard>
            )}

            {view === 'restaurant' && timeline.length > 0 && (
                <BentoCard className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <UtensilsCrossed className="w-5 h-5 text-amber-500" />
                            <h2 className="font-bold text-slate-800">Restaurant Engagement Tracker</h2>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                            <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
                                <ThumbsUp className="w-3.5 h-3.5" />
                                {timeline.filter(r => r.status === 'clicked').length} Rated
                            </span>
                            <span className="flex items-center gap-1.5 text-slate-400 font-bold">
                                <ThumbsDown className="w-3.5 h-3.5" />
                                {timeline.filter(r => r.status !== 'clicked').length} Pending
                            </span>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
                        {timeline.map((item) => (
                            <div
                                key={item.id}
                                className={cn(
                                    "p-4 rounded-xl border transition-all",
                                    item.status === 'clicked'
                                        ? "bg-emerald-50/50 border-emerald-200"
                                        : "bg-slate-50/50 border-slate-200"
                                )}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black",
                                            item.status === 'clicked'
                                                ? "bg-emerald-100 text-emerald-700"
                                                : "bg-slate-100 text-slate-500"
                                        )}>
                                            {item.roomNumber?.replace('Bill #', '') || 'ORD'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">{item.guestName}</p>
                                            <p className="text-[10px] text-slate-400">Total: {item.roomType || 'N/A'}</p>
                                        </div>
                                    </div>
                                    {item.status === 'clicked' ? (
                                        <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
                                            <Star className="w-3 h-3 fill-emerald-500" /> Rated
                                        </span>
                                    ) : (
                                        <StatusPill status={item.status} />
                                    )}
                                </div>
                                <div className="text-[11px] text-slate-400 mt-1">
                                    <span>Sent: {format(new Date(item.sentAt), 'dd MMM, p')}</span>
                                    {item.clickedAt && (
                                        <span className="ml-2 text-emerald-500 font-bold">
                                            • Clicked {format(new Date(item.clickedAt), 'p')}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </BentoCard>
            )}

            {/* Bottom Info */}
            <BentoCard className="p-5 border-l-4 border-l-green-500">
                <div className="flex items-start gap-4">
                    <div className="p-2 bg-green-50 rounded-lg shrink-0">
                        <Zap className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                        <p className="font-bold text-slate-800 text-sm">How Tracking Works</p>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            Every WhatsApp message sent through the PMS is automatically tracked via Meta&apos;s webhook API.
                            <strong> Delivery</strong> confirms the message reached the device.
                            <strong> Read</strong> confirms the guest opened it.
                            <strong> Click</strong> tracks if the guest tapped a tracked link (like a Google Review).
                            All metrics update in real-time. Data older than 3 months is auto-purged via the cleanup button.
                        </p>
                    </div>
                </div>
            </BentoCard>
        </div>
    );
}
