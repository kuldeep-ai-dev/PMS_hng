'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { BentoCard } from '@/components/ui/BentoCard';
import { Receipt, TrendingUp, Users, UtensilsCrossed, Landmark, Calendar, Zap, Clock, History } from 'lucide-react';
import { DashboardChart } from '@/components/dashboard/DashboardChart';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const EmptyState = ({ icon: Icon, label }: any) => (
    <div className="h-full flex flex-col items-center justify-center text-slate-300 py-10 opacity-50">
        <Icon className="w-12 h-12 mb-3 opacity-20" />
        <p className="text-[10px] font-black uppercase tracking-widest">{label}</p>
    </div>
);

const iconMap: Record<string, any> = {
    TrendingUp,
    Landmark,
    Receipt,
    UtensilsCrossed,
    Users,
    Calendar,
    Zap,
    Clock,
    History
};

export default function RestaurantDashboardClient({ initialData, stats: initialStats }: { initialData: any, stats: any[] }) {
    const [stats, setStats] = useState(initialStats);
    const [tables, setTables] = useState(initialData.tables || []);
    const [topItems, setTopItems] = useState(initialData.processedTopItems || []);
    const [recentActivity, setRecentActivity] = useState(initialData.recentActivity || []);
    const [reservations, setReservations] = useState(initialData.todayReservations || []);
    const [waiterPerformance, setWaiterPerformance] = useState(initialData.waiterPerformance || []);

    const supabase = createClient();

    // Stabilize Realtime Subscriptions
    useEffect(() => {
        const channel = supabase
            .channel('restaurant-insights-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_orders' }, () => {
                toast.info('New Order Activity');
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables' }, () => {
                toast.info('Table Status Updated');
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase]);

    return (
        <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto h-full pb-10">

            <div className="flex flex-col md:flex-row md:items-center justify-between mb-2 mt-2 gap-4 px-4 md:px-0">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Restaurant Dashboard</h1>
                    <p className="text-sm font-medium text-slate-500">Live Seating & POS Financials</p>
                </div>
                {initialData.businessDate && (
                    <div className="px-5 py-2.5 bg-slate-900 border border-slate-700 text-white rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.1)] text-sm font-bold flex items-center gap-3">
                        <div className="p-1 rounded-full bg-blue-500/20">
                            <Calendar className="w-4 h-4 text-blue-400" />
                        </div>
                        <span>Business Date: <span className="text-blue-300 ml-1">{initialData.businessDate}</span></span>
                    </div>
                )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 px-4 md:px-0 items-stretch">
                {stats.map((stat: any) => {
                    const Icon = iconMap[stat.icon] || TrendingUp;
                    return (
                        <div key={stat.label} className={cn(
                            "relative bg-white border border-slate-200 shadow-sm rounded-[24px] p-6 h-full transition-all duration-500",
                            "hover:shadow-2xl hover:shadow-slate-200/50 hover:border-slate-300 hover:-translate-y-2 group overflow-hidden bg-gradient-to-br",
                            stat.activeGradient
                        )}>
                            <div className="flex flex-col h-full justify-between gap-6 relative z-10">
                                <div className="flex justify-between items-start">
                                    <div className={cn(
                                        "p-3 rounded-2xl transition-all duration-700 group-hover:scale-110 group-hover:rotate-6 shadow-lg",
                                        stat.activeIconBg
                                    )}>
                                        <Icon className="w-5 h-5 text-white" />
                                    </div>
                                    <div className={cn(
                                        "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 outline outline-1 outline-white/50 bg-slate-50 text-slate-500",
                                        "group-hover:bg-white group-hover:shadow-sm"
                                    )}>
                                        {stat.trend}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] leading-none mb-1 group-hover:text-slate-500 transition-colors">{stat.label}</p>
                                    <div className="flex items-baseline gap-2">
                                        <h3 className={cn(
                                            "text-3xl font-black tracking-tighter text-slate-900 group-hover:scale-105 transition-transform duration-500 origin-left tabular-nums"
                                        )}>
                                            {stat.value}
                                        </h3>
                                    </div>
                                </div>
                            </div>

                            {/* Decorative Watermark */}
                            <Icon className={cn(
                                "absolute -bottom-4 -right-4 w-24 h-24 opacity-[0.03] -rotate-12 transition-all duration-1000 group-hover:rotate-0 group-hover:scale-125 group-hover:opacity-[0.07]",
                                stat.color
                            )} />
                        </div>
                    );
                })}
            </div>

            <div className="flex flex-col gap-6 px-4 md:px-0">
                {/* Automatic Floor Plan Card */}
                <BentoCard className="bg-white p-6 md:p-10 border border-slate-200/60 shadow-sm rounded-3xl overflow-hidden min-h-[600px] relative flex flex-col">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 relative z-40">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Live Seating Layout</h2>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-[0.2em] mt-1 opacity-60">Status-mapped intelligent grid</p>
                        </div>

                        <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-200 gap-1">
                            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500 rounded-xl shadow-sm text-white font-black text-[10px] uppercase tracking-widest">
                                Vacant
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-rose-500 rounded-xl shadow-sm text-white font-black text-[10px] uppercase tracking-widest">
                                Occupied
                            </div>
                        </div>
                    </div>

                    {/* Automatic Responsive Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-24 gap-y-32 items-center justify-items-center">
                        {tables.map((table: any) => (
                            <motion.div
                                key={table.id}
                                layout
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="relative group p-4"
                            >
                                {/* Visual Representation of Table */}
                                <div
                                    className={cn(
                                        "w-24 h-24 md:w-32 md:h-32 relative flex items-center justify-center transition-all duration-700 shadow-xl border-4 border-white",
                                        table.shape === 'round' ? "rounded-full" : "rounded-2xl",
                                        table.displayStatus === 'Vacant' ? "bg-emerald-500" : "bg-rose-500"
                                    )}
                                >
                                    {/* Table Label */}
                                    <div className="text-center">
                                        <p className="text-sm font-black text-white/40 uppercase tracking-widest opacity-60">Table</p>
                                        <p className="text-2xl md:text-3xl font-black text-white tracking-tighter leading-none">{table.table_number}</p>
                                        <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] mt-2">{table.capacity} Pax</p>
                                    </div>

                                    {/* Darker Chairs Visual Representation */}
                                    <div className="absolute inset-[-15%] pointer-events-none">
                                        {Array.from({ length: table.capacity || 2 }).map((_, i) => {
                                            const angle = (360 / table.capacity) * i;
                                            const rad = (angle * Math.PI) / 180;
                                            const r = 54;
                                            return (
                                                <div
                                                    key={i}
                                                    className="absolute w-4 h-4 bg-slate-800 rounded-lg shadow-2xl border border-slate-700 active:scale-110 transition-transform"
                                                    style={{
                                                        left: `${50 + r * Math.cos(rad)}%`,
                                                        top: `${50 + r * Math.sin(rad)}%`,
                                                        transform: `translate(-50%, -50%) rotate(${angle + 90}deg)`
                                                    }}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Status Pulse Glow */}
                                <div className={cn(
                                    "absolute inset-0 rounded-full blur-2xl opacity-20 -z-10 animate-pulse transition-colors",
                                    table.displayStatus === 'Vacant' ? "bg-emerald-400" : "bg-rose-400"
                                )} />
                            </motion.div>
                        ))}
                    </div>

                    {tables.length === 0 && (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-300 py-20">
                            <UtensilsCrossed className="w-20 h-20 mb-4 opacity-10 animate-pulse" />
                            <p className="font-black uppercase tracking-widest text-xs">No tables active</p>
                        </div>
                    )}
                </BentoCard>

                {/* Revenue Trend - Full Width */}
                <BentoCard className="bg-white p-8 border border-slate-200/60 shadow-sm rounded-3xl flex flex-col min-h-[400px]">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Revenue Trend</h2>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1 opacity-60">Last 7 Days Analysis</p>
                        </div>
                    </div>
                    <div className="flex-1 min-h-0">
                        <DashboardChart data={initialData.chartData} />
                    </div>
                </BentoCard>

                {/* Feature Rich Panel: Kitchen Heatmap, Recent Activity, Reservations & Waiters */}
                <div className="flex flex-col gap-6">
                    {/* Live Operational Feed */}
                    <BentoCard className="bg-white border border-slate-200/60 shadow-sm rounded-[32px] overflow-hidden">
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                                    <History className="w-6 h-6 text-blue-600" />
                                    Live Activity Ledger
                                </h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Real-time Operational Logs</p>
                            </div>
                        </div>

                        <div className="p-0">
                            <div className="grid grid-cols-12 gap-4 px-8 py-4 bg-slate-50/50 border-b border-slate-100">
                                <div className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Time</div>
                                <div className="col-span-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Source</div>
                                <div className="col-span-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Event</div>
                                <div className="col-span-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Status</div>
                            </div>
                            <div className="divide-y divide-slate-50 max-h-[350px] overflow-y-auto custom-scrollbar">
                                {recentActivity.length > 0 ? recentActivity.map((activity: any, idx: number) => (
                                    <div key={idx} className="grid grid-cols-12 gap-4 px-8 py-6 items-center hover:bg-slate-50/50 transition-colors">
                                        <div className="col-span-2">
                                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{format(new Date(activity.order_time), 'HH:mm')}</span>
                                        </div>
                                        <div className="col-span-3">
                                            <div className="inline-flex items-center px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-black text-slate-700 uppercase tracking-wider">
                                                {activity.table?.table_number ? `Table ${activity.table.table_number}` : activity.room?.number ? `Room ${activity.room.number}` : 'Walk-in'}
                                            </div>
                                        </div>
                                        <div className="col-span-4">
                                            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                                                Order <span className="text-slate-400">#{activity.bill_no || activity.kot_no || idx}</span> Generated
                                            </span>
                                        </div>
                                        <div className="col-span-3 text-right">
                                            <div className={cn(
                                                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.15em]",
                                                activity.status === 'billed' ? "bg-emerald-50 text-emerald-600" :
                                                    activity.status === 'served' ? "bg-blue-50 text-blue-600" : "bg-orange-50 text-orange-600"
                                            )}>
                                                <div className={cn(
                                                    "w-1.5 h-1.5 rounded-full",
                                                    activity.status === 'billed' ? "bg-emerald-500" :
                                                        activity.status === 'served' ? "bg-blue-500" : "bg-orange-500"
                                                )} />
                                                {activity.status}
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50 py-20">
                                        <Clock className="w-12 h-12 mb-2 opacity-10" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">Awaiting events...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </BentoCard>

                    {/* Top Items - Kitchen Heatmap */}
                    <BentoCard className="bg-white border border-slate-200/60 shadow-sm rounded-[32px] overflow-hidden">
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                                    <Zap className="w-6 h-6 text-orange-500" />
                                    Kitchen Heatmap
                                </h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Hottest Sellers Today</p>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 rounded-2xl border border-orange-100">
                                <TrendingUp className="w-4 h-4 text-orange-600" />
                                <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Live Volume</span>
                            </div>
                        </div>

                        <div className="p-0">
                            <div className="grid grid-cols-12 gap-4 px-8 py-4 bg-slate-50/50 border-b border-slate-100">
                                <div className="col-span-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Menu Item</div>
                                <div className="col-span-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Orders</div>
                                <div className="col-span-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Trend</div>
                            </div>
                            <div className="divide-y divide-slate-50 max-h-[350px] overflow-y-auto custom-scrollbar">
                                {topItems.length > 0 ? topItems.map((item: any, idx: number) => {
                                    const maxCount = topItems[0].count;
                                    const percentage = (item.count / maxCount) * 100;
                                    return (
                                        <div key={idx} className="grid grid-cols-12 gap-4 px-8 py-6 items-center hover:bg-slate-50/50 transition-colors group">
                                            <div className="col-span-6">
                                                <span className="text-sm font-black text-slate-800 uppercase tracking-tight group-hover:text-orange-600 transition-colors">{item.name}</span>
                                            </div>
                                            <div className="col-span-3">
                                                <div className="inline-flex items-center px-3 py-1 bg-slate-100 rounded-lg text-[11px] font-black text-slate-600 uppercase tracking-wider">
                                                    {item.count} Sold
                                                </div>
                                            </div>
                                            <div className="col-span-3 text-right">
                                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden max-w-[100px] ml-auto">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${percentage}%` }}
                                                        className="h-full bg-orange-500 rounded-full"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }) : <div className="p-20"><EmptyState icon={Zap} label="No kitchen data yet" /></div>}
                            </div>
                        </div>
                    </BentoCard>

                    {/* Today's Reservations Feed */}
                    <BentoCard className="bg-white border border-slate-200/60 shadow-sm rounded-[32px] overflow-hidden">
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                                    <Calendar className="w-6 h-6 text-teal-600" />
                                    Reservation Ledger
                                </h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Today's Guest Arrivals</p>
                            </div>
                        </div>

                        <div className="p-0">
                            <div className="grid grid-cols-12 gap-4 px-8 py-4 bg-slate-50/50 border-b border-slate-100">
                                <div className="col-span-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Guest</div>
                                <div className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Arrival</div>
                                <div className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Pax</div>
                                <div className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Table</div>
                                <div className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Status</div>
                            </div>
                            <div className="divide-y divide-slate-50 max-h-[350px] overflow-y-auto custom-scrollbar">
                                {reservations.length > 0 ? reservations.map((res: any, idx: number) => (
                                    <div key={idx} className="grid grid-cols-12 gap-4 px-8 py-6 items-center hover:bg-slate-50/50 transition-colors group">
                                        <div className="col-span-4 flex items-center gap-3">
                                            <div className="w-8 h-8 bg-teal-50 rounded-xl flex items-center justify-center font-black text-teal-600 text-xs">
                                                {res.guest_name.charAt(0)}
                                            </div>
                                            <span className="text-sm font-black text-slate-800 uppercase truncate">{res.guest_name}</span>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-[11px] font-bold text-slate-500 uppercase">{format(new Date(res.reservation_time), 'HH:mm')}</span>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest">{res.pax} Guests</span>
                                        </div>
                                        <div className="col-span-2 font-black text-slate-900 text-xs">Table {res.table?.table_number}</div>
                                        <div className="col-span-2 text-right">
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                Expected
                                            </div>
                                        </div>
                                    </div>
                                )) : <div className="p-20"><EmptyState icon={Calendar} label="No reservations today" /></div>}
                            </div>
                        </div>
                    </BentoCard>

                    {/* Waiter Performance Leaderboard */}
                    <BentoCard className="bg-white border border-slate-200/60 shadow-sm rounded-[32px] overflow-hidden">
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                                    <Users className="w-6 h-6 text-indigo-600" />
                                    Staff Performance
                                </h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Revenue Attribution Today</p>
                            </div>
                        </div>

                        <div className="p-0">
                            <div className="grid grid-cols-12 gap-4 px-8 py-4 bg-slate-50/50 border-b border-slate-100">
                                <div className="col-span-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Server Name</div>
                                <div className="col-span-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Sales</div>
                                <div className="col-span-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Efficiency</div>
                            </div>
                            <div className="divide-y divide-slate-50 max-h-[350px] overflow-y-auto custom-scrollbar">
                                {waiterPerformance.length > 0 ? waiterPerformance.map((waiter: any, idx: number) => (
                                    <div key={idx} className="grid grid-cols-12 gap-4 px-8 py-6 items-center hover:bg-slate-50/50 transition-colors group">
                                        <div className="col-span-5 flex items-center gap-3">
                                            <div className="relative">
                                                <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-600 text-xs group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                    {waiter.name.charAt(0)}
                                                </div>
                                                {idx === 0 && <span className="absolute -top-2 -right-2 text-xs drop-shadow-sm">👑</span>}
                                            </div>
                                            <span className="text-sm font-black text-slate-800 uppercase tracking-tight">{waiter.name}</span>
                                        </div>
                                        <div className="col-span-3 font-black text-slate-900 text-sm tracking-tighter">
                                            ₹{waiter.total.toLocaleString()}
                                        </div>
                                        <div className="col-span-4 text-right">
                                            <div className="inline-flex items-center gap-2">
                                                <div className="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${(waiter.total / (waiterPerformance[0]?.total || 1)) * 100}%` }}
                                                        className="h-full bg-indigo-500 rounded-full"
                                                    />
                                                </div>
                                                <span className="text-[10px] font-black text-indigo-600">{Math.round((waiter.total / (waiterPerformance[0]?.total || 1)) * 100)}%</span>
                                            </div>
                                        </div>
                                    </div>
                                )) : <div className="p-20"><EmptyState icon={Users} label="No server data today" /></div>}
                            </div>
                        </div>
                    </BentoCard>

                </div>
            </div>
        </div>
    );
}
