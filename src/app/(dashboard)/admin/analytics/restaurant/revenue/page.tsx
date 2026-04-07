'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Utensils, TrendingUp, DollarSign,
    PieChart as PieChartIcon, Clock, Filter,
    Download, Calendar, ArrowUpRight,
    UtensilsCrossed, Coffee, Wine, ChefHat, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { ChartCard, COLORS } from '../../components/AnalyticsCharts';

// Dynamically import charts to prevent SSR issues with recharts in Turbopack
const RevenueAreaChart = dynamic(() => import('../../components/AnalyticsCharts').then(mod => mod.RevenueAreaChart), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-slate-50 animate-pulse rounded-xl" />
});
const DistributionPieChart = dynamic(() => import('../../components/AnalyticsCharts').then(mod => mod.DistributionPieChart), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-slate-50 animate-pulse rounded-xl" />
});
const ComparisonBarChart = dynamic(() => import('../../components/AnalyticsCharts').then(mod => mod.ComparisonBarChart), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-slate-50 animate-pulse rounded-xl" />
});
import { createClient } from '@/utils/supabase/client';
import { startOfMonth, startOfDay, endOfDay, subDays, format } from 'date-fns';
import { formatCurrency } from '@/lib/currency';

export default function RestaurantRevenueAnalytics() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);
    const supabase = createClient();

    const fetchAnalytics = useCallback(async () => {
        setLoading(true);
        try {
            const now = new Date();
            const startOfMonthDate = startOfMonth(now);
            const startOfToday = startOfDay(now);
            const endOfToday = endOfDay(now);

            // 1 & 4. Parallel Data Fetching: Orders and Categories
            const [
                { data: monthOrders, error: mError },
                { data: categoryDataRaw, error: cError }
            ] = await Promise.all([
                supabase
                    .from('restaurant_orders')
                    .select('total_amount, order_time, status')
                    .gte('order_time', startOfMonthDate.toISOString())
                    .lte('order_time', endOfToday.toISOString())
                    .eq('payment_status', 'paid'),
                supabase
                    .from('restaurant_order_items')
                    .select(`
                        quantity,
                        price_at_time,
                        menu_item:restaurant_menu_items (
                            category:restaurant_categories (name)
                        ),
                        order:restaurant_orders!inner (status)
                    `)
                    .gte('created_at', startOfMonthDate.toISOString())
                    .eq('order.payment_status', 'paid')
            ]);

            if (mError) throw mError;
            if (cError) throw cError;

            const mtdSales = monthOrders?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;
            const mtdOrdersCount = monthOrders?.length || 0;
            const aov = mtdOrdersCount > 0 ? mtdSales / mtdOrdersCount : 0;

            // 2. Daily Covers (Today)
            const todayOrders = monthOrders?.filter(o => new Date(o.order_time) >= startOfToday) || [];
            const todayCovers = todayOrders.length;

            // 3. Sales Trend (Last 7 Days)
            const trendMap = new Map();
            for (let i = 6; i >= 0; i--) {
                const date = format(subDays(now, i), 'dd MMM');
                trendMap.set(date, { date, revenue: 0, covers: 0 });
            }

            monthOrders?.forEach(o => {
                const date = format(new Date(o.order_time), 'dd MMM');
                if (trendMap.has(date)) {
                    const d = trendMap.get(date);
                    d.revenue += Number(o.total_amount);
                    d.covers += 1;
                }
            });
            const salesTrend = Array.from(trendMap.values());

            const catMap = new Map();
            categoryDataRaw?.forEach((item: any) => {
                const name = item.menu_item?.category?.name || 'Other';
                const val = (item.quantity * Number(item.price_at_time || 0));
                catMap.set(name, (catMap.get(name) || 0) + val);
            });
            const categoryData = Array.from(catMap.entries()).map(([name, value]) => ({ name, value }));

            // 5. Hourly Performance (MTD)
            const hourMap = new Map();
            for (let i = 11; i <= 23; i++) {
                const label = i > 12 ? `${i - 12}pm` : i === 12 ? '12pm' : `${i}am`;
                hourMap.set(i, { date: label, sales: 0 });
            }

            monthOrders?.forEach(o => {
                const hour = new Date(o.order_time).getHours();
                if (hourMap.has(hour)) {
                    hourMap.get(hour).sales += Number(o.total_amount);
                }
            });
            const hourlyPerformance = Array.from(hourMap.values());

            // Peak Hour
            const peakHourObj = [...hourlyPerformance].sort((a, b) => b.sales - a.sales)[0];

            setStats({
                mtdSales,
                aov,
                todayCovers,
                peakHour: peakHourObj?.date || 'N/A',
                salesTrend,
                categoryData,
                hourlyPerformance,
                formattedMtdSales: await formatCurrency(mtdSales),
                formattedAov: await formatCurrency(aov)
            });
        } catch (error: any) {
            console.error('Error fetching restaurant analytics:', error);
            // Dynamic import to avoid SSR issues if toast is used in a specific way
            import('sonner').then(({ toast }) => {
                toast.error('Analytics Error: ' + (error.message || 'Unknown error'));
            });
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchAnalytics();

        const channel = supabase
            .channel('rest-revenue-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_orders' }, () => fetchAnalytics())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_order_items' }, () => fetchAnalytics())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [fetchAnalytics]);

    if (loading || !stats) {
        return (
            <div className="p-6 bg-slate-50/30 min-h-screen">
                <div className="flex flex-col gap-8 max-w-7xl mx-auto animate-pulse">
                    <div className="flex justify-between items-center">
                        <div className="space-y-2">
                            <div className="h-10 w-64 bg-slate-200 rounded-2xl"></div>
                            <div className="h-4 w-48 bg-slate-100 rounded-lg"></div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-32 bg-white rounded-3xl border border-slate-100 shadow-sm"></div>
                        ))}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 h-[400px] bg-white rounded-3xl border border-slate-100 shadow-sm"></div>
                        <div className="h-[400px] bg-white rounded-3xl border border-slate-100 shadow-sm"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-slate-50/30 min-h-screen">
            <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-20">
                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-6">
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                                <div className="p-2.5 bg-teal-100 rounded-2xl shadow-sm">
                                    <Utensils className="w-7 h-7 text-teal-600" />
                                </div>
                                Restaurant Revenue
                            </h1>
                            <p className="text-sm text-slate-500 mt-2 font-medium uppercase tracking-wider">
                                Daily Sales, Category Performance and Covers Tracking
                            </p>
                        </div>
                    </div>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <RevenueKPICard
                        icon={DollarSign}
                        label="Total Sales (MTD)"
                        value={stats.formattedMtdSales}
                        trend="Real-time"
                        trendUp={true}
                        color="text-teal-600"
                        bg="bg-teal-50"
                    />
                    <RevenueKPICard
                        icon={UtensilsCrossed}
                        label="Avg. Order Value"
                        value={stats.formattedAov}
                        trend="Direct"
                        trendUp={true}
                        color="text-blue-600"
                        bg="bg-blue-50"
                    />
                    <RevenueKPICard
                        icon={ChefHat}
                        label="Daily Covers"
                        value={stats.todayCovers.toString()}
                        trend="Today"
                        trendUp={true}
                        color="text-emerald-600"
                        bg="bg-emerald-50"
                    />
                    <RevenueKPICard
                        icon={Clock}
                        label="Peak Sales Hour"
                        value={stats.peakHour}
                        trend="Frequency"
                        trendUp={true}
                        color="text-violet-600"
                        bg="bg-violet-50"
                    />
                </div>

                {/* Main Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <ChartCard title="Daily Sales Momentum" subtitle="Revenue tracking over the last 7 days" className="lg:col-span-2">
                        <RevenueAreaChart data={stats.salesTrend} color={COLORS.primary[0]} />
                    </ChartCard>

                    <ChartCard title="Revenue by Category" subtitle="Food vs Beverage split">
                        <DistributionPieChart data={stats.categoryData} />
                    </ChartCard>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <ChartCard title="Peak Performance Hours" subtitle="Volume distribution by time" className="lg:col-span-2">
                        <ComparisonBarChart
                            data={stats.hourlyPerformance}
                            categories={[
                                { key: 'sales', name: 'Sales Volume', color: COLORS.primary[0] }
                            ]}
                        />
                    </ChartCard>

                    <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col">
                        <h3 className="text-sm font-black text-slate-800 tracking-tight uppercase mb-6 flex items-center gap-2">
                            <Coffee className="w-4 h-4 text-slate-400" />
                            Popular Categories
                        </h3>
                        <div className="space-y-4">
                            {stats.categoryData.slice(0, 4).map((cat: any, i: number) => {
                                const total = stats.categoryData.reduce((sum: number, c: any) => sum + c.value, 0);
                                const percentage = total > 0 ? Math.round((cat.value / total) * 100) : 0;
                                const colors = ['bg-teal-500', 'bg-blue-500', 'bg-emerald-500', 'bg-violet-500'];
                                return (
                                    <AddonItem key={cat.name} label={cat.name} value={percentage} color={colors[i % colors.length]} />
                                );
                            })}
                        </div>
                        <div className="mt-auto pt-6 border-t border-dashed border-slate-100 italic text-[10px] text-slate-400 font-medium text-center">
                            Live data from Restaurant POS
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function RevenueKPICard({ icon: Icon, label, value, trend, trendUp, color, bg }: any) {
    return (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-4">
                <div className={cn("p-2.5 rounded-2xl transition-transform group-hover:scale-110 shadow-sm", bg, color)}>
                    <Icon className="w-5 h-5" />
                </div>
                <div className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black tracking-widest",
                    trendUp ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"
                )}>
                    {trend}
                </div>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{label}</p>
            <h4 className="text-2xl font-black text-slate-900 tracking-tight">{value}</h4>
        </div>
    );
}

function AddonItem({ label, value, color }: any) {
    return (
        <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                <span className="text-slate-500 font-bold">{label}</span>
                <span className="text-slate-700 font-black">{value}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full", color)} style={{ width: `${value}%` }} />
            </div>
        </div>
    );
}
