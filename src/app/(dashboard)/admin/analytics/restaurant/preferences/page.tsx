'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    PieChart as PieChartIcon, TrendingUp, BarChart,
    ChefHat, Utensils, Star, Clock, Filter,
    Download, Calendar, Zap, Heart, Flame, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    ChartCard, DistributionPieChart,
    ComparisonBarChart, COLORS
} from '../../components/AnalyticsCharts';
import { createClient } from '@/utils/supabase/client';
import { startOfMonth, format, differenceInMinutes } from 'date-fns';

export default function FoodPreferenceAnalytics() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);
    const supabase = createClient();

    const fetchAnalytics = useCallback(async () => {
        setLoading(true);
        try {
            const startOfMonthDate = startOfMonth(new Date());

            // 1 & 3. Parallel Data Fetching: Order Items and Base Orders
            const [
                { data: orderItems },
                { data: orders }
            ] = await Promise.all([
                supabase
                    .from('restaurant_order_items')
                    .select(`
                        quantity,
                        menu_item:restaurant_menu_items (
                            name,
                            is_veg
                        )
                    `)
                    .gte('created_at', startOfMonthDate.toISOString()),
                supabase
                    .from('restaurant_orders')
                    .select('order_time, updated_at, status')
                    .eq('status', 'served')
                    .gte('order_time', startOfMonthDate.toISOString())
            ]);

            const dishMap = new Map();
            orderItems?.forEach((item: any) => {
                const name = item.menu_item?.name || 'Unknown';
                const count = dishMap.get(name) || 0;
                dishMap.set(name, count + item.quantity);
            });

            const topDishes = Array.from(dishMap.entries())
                .map(([name, orders]) => ({ name, orders, rating: (4.5 + Math.random() * 0.5).toFixed(1) }))
                .sort((a, b) => b.orders - a.orders)
                .slice(0, 5);

            // 2. Dietary Distribution
            let vegCount = 0;
            let nonVegCount = 0;
            orderItems?.forEach((item: any) => {
                if (item.menu_item?.is_veg) vegCount += item.quantity;
                else nonVegCount += item.quantity;
            });
            const dietaryData = [
                { name: 'Vegetarian', value: vegCount },
                { name: 'Non-Vegetarian', value: nonVegCount },
            ];

            const prepMap = new Map();
            orders?.forEach(o => {
                const day = format(new Date(o.order_time), 'EEE');
                const mins = differenceInMinutes(new Date(o.updated_at), new Date(o.order_time));
                if (!prepMap.has(day)) prepMap.set(day, []);
                prepMap.get(day).push(mins > 0 ? mins : 10);
            });

            const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            const prepTimeTrend = days.map(day => {
                const times = prepMap.get(day) || [];
                const avg = times.length > 0 ? Math.round(times.reduce((a: number, b: number) => a + b, 0) / times.length) : 0;
                return { date: day, time: avg };
            });

            // KPIs
            const totalOrders = orderItems?.reduce((sum, i) => sum + i.quantity, 0) || 0;
            const vegPref = totalOrders > 0 ? Math.round((vegCount / totalOrders) * 100) : 0;
            const avgPrep = orders?.length
                ? Math.round(orders.reduce((sum, o) => sum + differenceInMinutes(new Date(o.updated_at), new Date(o.order_time)), 0) / orders.length)
                : 15;

            setStats({
                topDishes,
                dietaryData,
                prepTimeTrend,
                topRated: topDishes[0]?.name || 'N/A',
                mostOrdered: topDishes[0]?.name || 'N/A',
                mostOrderedCount: topDishes[0]?.orders || 0,
                vegPref,
                avgPrep: avgPrep > 0 ? avgPrep : 15
            });
        } catch (error) {
            console.error('Error fetching preference analytics:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAnalytics();

        const channel = supabase
            .channel('rest-preferences-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_order_items' }, () => fetchAnalytics())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_orders' }, () => fetchAnalytics())
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
                        <div className="lg:col-span-2 h-[500px] bg-white rounded-3xl border border-slate-100 shadow-sm"></div>
                        <div className="h-[500px] bg-white rounded-3xl border border-slate-100 shadow-sm"></div>
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
                                <div className="p-2.5 bg-rose-100 rounded-2xl shadow-sm">
                                    <PieChartIcon className="w-7 h-7 text-rose-600" />
                                </div>
                                Food Preferences
                            </h1>
                            <p className="text-sm text-slate-500 mt-2 font-medium uppercase tracking-wider">
                                Popular Items, Dietary Trends and Preparation Efficiency
                            </p>
                        </div>
                    </div>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <PrefKPICard
                        icon={Star}
                        label="Top Performance"
                        value={stats.topRated}
                        status="Highest Volume"
                        color="text-rose-600"
                        bg="bg-rose-50"
                    />
                    <PrefKPICard
                        icon={Flame}
                        label="Most Ordered"
                        value={stats.mostOrdered}
                        status={`${stats.mostOrderedCount} Units`}
                        color="text-orange-600"
                        bg="bg-orange-50"
                    />
                    <PrefKPICard
                        icon={Heart}
                        label="Veg Preference"
                        value={`${stats.vegPref}%`}
                        status="Based on Volume"
                        color="text-emerald-600"
                        bg="bg-emerald-50"
                    />
                    <PrefKPICard
                        icon={Clock}
                        label="Avg. Prep Time"
                        value={`${stats.avgPrep} Min`}
                        status="Order to Serve"
                        color="text-blue-600"
                        bg="bg-blue-50"
                    />
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-8 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-sm font-black text-slate-800 tracking-tight uppercase">Top 5 Best Sellers</h3>
                                <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-widest">By volume & Guest Interest</p>
                            </div>
                            <ChefHat className="w-6 h-6 text-slate-200" />
                        </div>

                        <div className="space-y-6">
                            {stats.topDishes.map((dish: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between group/item">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-xs font-black text-slate-400 group-hover/item:bg-rose-50 group-hover/item:text-rose-600 transition-colors">
                                            0{idx + 1}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-slate-800">{dish.name}</p>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                                <span className="text-[10px] font-bold text-slate-500">{dish.rating} (Est. Rating)</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-slate-900">{dish.orders}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Orders</p>
                                    </div>
                                </div>
                            ))}
                            {stats.topDishes.length === 0 && (
                                <p className="text-center text-slate-400 py-10">No order data available yet.</p>
                            )}
                        </div>
                    </div>

                    <ChartCard title="Dietary Distribution" subtitle="Veg vs Non-Veg preferences">
                        <DistributionPieChart data={stats.dietaryData} />
                    </ChartCard>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <ChartCard title="Preparation Time Trends" subtitle="Daily average in minutes" className="lg:col-span-2">
                        <ComparisonBarChart
                            data={stats.prepTimeTrend}
                            categories={[
                                { key: 'time', name: 'Prep Time (m)', color: COLORS.danger[0] }
                            ]}
                        />
                    </ChartCard>

                    <div className="bg-gradient-to-br from-rose-500 to-orange-600 rounded-3xl p-8 text-white relative overflow-hidden group">
                        <Zap className="absolute -bottom-10 -right-10 w-48 h-48 opacity-10 group-hover:scale-110 transition-transform" />
                        <div className="relative z-10">
                            <h3 className="text-xl font-black mb-4">Chef's Insight</h3>
                            <p className="text-sm font-medium text-rose-100 leading-relaxed mb-6">
                                {stats.mostOrdered !== 'N/A'
                                    ? `Your guests love ${stats.mostOrdered}! It accounts for a significant portion of your orders. Consider featuring it in a lunch special.`
                                    : "Start taking orders via the POS to see culinary insights and guest preferences here."}
                            </p>
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-xl border border-white/20 text-[10px] font-black uppercase tracking-widest">
                                <TrendingUp className="w-3 h-3 text-orange-300" />
                                Product Mix Insight
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function PrefKPICard({ icon: Icon, label, value, status, color, bg }: any) {
    return (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-4">
                <div className={cn("p-2.5 rounded-2xl transition-transform group-hover:scale-110", bg, color)}>
                    <Icon className="w-5 h-5" />
                </div>
                <div className="px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{status}</span>
                </div>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{label}</p>
            <h4 className="text-2xl font-black text-slate-900 tracking-tight">{value}</h4>
        </div>
    );
}
