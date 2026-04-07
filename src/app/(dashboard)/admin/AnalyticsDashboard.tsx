'use client';

import { useState, useEffect, useCallback } from 'react';
import { BentoCard } from '@/components/ui/BentoCard';
import { getPerformanceAnalytics, RevenueMetrics, TrendData } from './actions-analytics';
import { Loader2, TrendingUp, Hotel, Utensils, IndianRupee } from 'lucide-react';
import dynamic from 'next/dynamic';
import { createClient } from '@/utils/supabase/client';

// Dynamically import charts to prevent SSR issues with recharts in Turbopack
const BookingTrendChart = dynamic(() => import('./components/DashboardCharts').then(mod => mod.BookingTrendChart), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-slate-50 animate-pulse rounded-xl" />
});
const RevenueTrendChart = dynamic(() => import('./components/DashboardCharts').then(mod => mod.RevenueTrendChart), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-slate-50 animate-pulse rounded-xl" />
});

function MetricCard({ title, icon: Icon, metrics }: { title: string, icon: any, metrics: RevenueMetrics }) {
    return (
        <BentoCard className="p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                    <Icon className="w-5 h-5" />
                </div>
                <h2 className="font-bold text-slate-800">{title}</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today</span>
                    <div className="text-xl font-bold text-slate-900 border-l-2 border-emerald-500 pl-3">
                        ₹{metrics.today.toLocaleString('en-IN')}
                    </div>
                </div>
                <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">This Week</span>
                    <div className="text-xl font-bold text-slate-900 border-l-2 border-blue-500 pl-3">
                        ₹{metrics.week.toLocaleString('en-IN')}
                    </div>
                </div>
                <div className="space-y-1 mt-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">This Month</span>
                    <div className="text-xl font-bold text-slate-900 border-l-2 border-purple-500 pl-3">
                        ₹{metrics.month.toLocaleString('en-IN')}
                    </div>
                </div>
                <div className="space-y-1 mt-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">This Year</span>
                    <div className="text-xl font-bold text-slate-900 border-l-2 border-orange-500 pl-3">
                        ₹{metrics.year.toLocaleString('en-IN')}
                    </div>
                </div>
            </div>

            {/* Today's Revenue Breakdown */}
            {metrics.today > 0 && (
                <div className="mt-6 pt-5 border-t border-slate-100">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Today's Collection</span>
                    </div>
                    {/* Visual Bar */}
                    <div className="h-2 w-full flex rounded-full overflow-hidden bg-slate-100 mb-3">
                        {metrics.breakdown && (
                            <>
                                <div className="bg-teal-500 h-full transition-all" style={{ width: `${(metrics.breakdown.cash / metrics.today) * 100}%` }} title={`Cash: ₹${metrics.breakdown.cash.toLocaleString()}`} />
                                <div className="bg-blue-500 h-full transition-all" style={{ width: `${(metrics.breakdown.card / metrics.today) * 100}%` }} title={`Card: ₹${metrics.breakdown.card.toLocaleString()}`} />
                                <div className="bg-indigo-500 h-full transition-all" style={{ width: `${(metrics.breakdown.online / metrics.today) * 100}%` }} title={`Online: ₹${metrics.breakdown.online.toLocaleString()}`} />
                            </>
                        )}
                    </div>
                    {/* Legend */}
                    {metrics.breakdown && (
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-500"></span> Cash</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Card</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500"></span> Online</span>
                        </div>
                    )}
                </div>
            )}
        </BentoCard>
    );
}

export function AnalyticsDashboard() {
    const [data, setData] = useState<{ hotel: RevenueMetrics, restaurant: RevenueMetrics, trends: TrendData[] } | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const res = await getPerformanceAnalytics();
            setData({
                hotel: res.hotelRevenue,
                restaurant: res.restaurantRevenue,
                trends: res.trends
            });
        } catch (err) {
            console.error('Analytics fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();

        // Realtime subscription for live updates
        const supabase = createClient();
        const channel = supabase
            .channel('admin-analytics-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_orders' }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => fetchData())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [fetchData]);

    if (loading || !data) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="h-48 bg-white rounded-2xl border border-slate-100" />
                    <div className="h-48 bg-white rounded-2xl border border-slate-100" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="h-[320px] bg-white rounded-2xl border border-slate-100" />
                    <div className="h-[320px] lg:col-span-2 bg-white rounded-2xl border border-slate-100" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <MetricCard title="Hotel Revenue" icon={Hotel} metrics={data.hotel} />
                <MetricCard title="Restaurant Revenue" icon={Utensils} metrics={data.restaurant} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Bookings Trend Chart */}
                <BentoCard className="p-6 lg:col-span-1">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                            <h2 className="font-bold text-slate-800">Booking Volume</h2>
                        </div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest border border-slate-200 px-2 py-1 rounded-md">30 Days</span>
                    </div>

                    <div className="h-[250px] w-full">
                        <BookingTrendChart data={data.trends} />
                    </div>
                </BentoCard>

                {/* Revenue Trend Chart */}
                <BentoCard className="p-6 lg:col-span-2">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                            <IndianRupee className="w-5 h-5" />
                        </div>
                        <h2 className="font-bold text-slate-800">Revenue Trends</h2>
                    </div>

                    <div className="h-[250px] w-full">
                        <RevenueTrendChart data={data.trends} />
                    </div>
                </BentoCard>
            </div>
        </div>
    );
}
