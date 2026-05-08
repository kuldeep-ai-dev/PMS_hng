'use client';

import {
    TrendingUp,
    CreditCard,
    Users,
    AlertCircle,
    ArrowUpRight,
    ArrowDownRight,
    UtensilsCrossed,
    BedDouble,
    Clock,
    UserCheck,
    BarChart3,
    Activity
} from 'lucide-react';
import { BentoCard } from '@/components/ui/BentoCard';
import { DashboardChart } from './DashboardChart';
import { formatCurrency } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface AdminDashboardProps {
    role?: string;
    stats: {
        todayRevenue: number;
        roomRevenue: number;
        restRevenue: number;
        todayLoss: number;
        presentStaff: number;
        attendanceRate: number;
        occupancyRate: number;
        totalRooms: number;
        occupiedRooms: number;
        revenueChartData: { date: string; revenue: number }[];
        attendanceDetails: any[];
    };
}

export function AdminDashboard({ stats, role }: AdminDashboardProps) {
    const formattedRevenue = stats.todayRevenue.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
    const formattedLoss = stats.todayLoss.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

    const isManager = role === 'manager';

    const keyMetrics = [
        {
            label: 'Room Revenue',
            value: stats.roomRevenue.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }),
            caption: 'Direct PMS Intake',
            icon: BedDouble,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50',
            trend: 'Live',
            trendUp: true
        },
        {
            label: 'Restaurant Revenue',
            value: stats.restRevenue.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }),
            caption: 'Dining & POS Sales',
            icon: UtensilsCrossed,
            color: 'text-orange-600',
            bg: 'bg-orange-50',
            trend: 'Today',
            trendUp: true
        },
        {
            label: 'Operating Loss',
            value: formattedLoss,
            caption: 'Refunds & Adjustments',
            icon: AlertCircle,
            color: 'text-rose-600',
            bg: 'bg-rose-50',
            trend: 'Last 24h',
            trendUp: false
        },
        {
            label: 'Total Occupancy',
            value: `${stats.occupancyRate}%`,
            caption: 'Active Room Inventory',
            icon: Users,
            color: 'text-teal-600',
            bg: 'bg-teal-50',
            trend: 'Live',
            trendUp: true
        },
        {
            label: 'Staff Attendance',
            value: `${stats.presentStaff}`,
            caption: `${stats.attendanceRate}% Participation`,
            icon: UserCheck,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
            trend: 'Today',
            trendUp: true
        },
    ];

    return (
        <div className="flex flex-col gap-8 pb-10">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                        {isManager ? 'Manager Dashboard' : 'Admin Executive Overview'}
                    </h1>
                    <p className="text-slate-500 font-medium">Real-time business intelligence and financial performance.</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-2xl shadow-sm">
                    <Activity className="w-4 h-4 text-teal-600" />
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-widest">System Status: <span className="text-emerald-600">Optimal</span></span>
                </div>
            </div>

            {/* Premium Stats Grid - 5 Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                {keyMetrics.map((metric) => (
                    <BentoCard key={metric.label} className="p-6 group hover:shadow-2xl transition-all duration-500 border-none bg-white ring-1 ring-slate-100">
                        <div className="flex justify-between items-start mb-4">
                            <div className={cn("p-3 rounded-2xl", metric.bg)}>
                                <metric.icon className={cn("w-6 h-6", metric.color)} />
                            </div>
                            <div className={cn(
                                "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider",
                                metric.trendUp ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400"
                            )}>
                                {metric.trendUp ? <ArrowUpRight className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                {metric.trend}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{metric.label}</p>
                            <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{metric.value}</h3>
                            <p className="text-xs font-bold text-slate-500">{metric.caption}</p>
                        </div>
                    </BentoCard>
                ))}
            </div>

            {/* Middle Analytics Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Revenue Chart */}
                <div className="lg:col-span-8 bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-teal-600" />
                                Growth Trajectory
                            </h2>
                            <p className="text-sm text-slate-500">Revenue trend for the last 7 operating days</p>
                        </div>
                        <div className="flex gap-2">
                            <span className="px-3 py-1.5 bg-slate-900 text-white text-[10px] font-black rounded-xl uppercase tracking-widest">Combined Revenue</span>
                        </div>
                    </div>
                    <DashboardChart data={stats.revenueChartData} />
                </div>

                {/* Staff Attendance Summary */}
                <div className="lg:col-span-4 bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm flex flex-col">
                    <div className="mb-6">
                        <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                            <UserCheck className="w-5 h-5 text-amber-600" />
                            Active Staff
                        </h2>
                        <p className="text-sm text-slate-500">Current presence monitoring</p>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-4 max-h-[350px] pr-2 custom-scrollbar">
                        {stats.attendanceDetails.length > 0 ? stats.attendanceDetails.map((record) => (
                            <div key={record.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-amber-200 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center font-black text-amber-600 text-sm border border-slate-100 overflow-hidden">
                                        {record.profiles?.photo_url ? (
                                            <img src={record.profiles.photo_url} alt={record.profiles.name} className="w-full h-full object-cover" />
                                        ) : (
                                            record.profiles?.name?.charAt(0).toUpperCase()
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <p className="text-sm font-black text-slate-900 leading-tight">{record.profiles?.name || 'Unknown Staff'}</p>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{record.profiles?.role?.replace('_', ' ') || 'Staff'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black text-slate-900">{record.check_in_time ? format(new Date(record.check_in_time), 'h:mm a') : 'Present'}</p>
                                    <span className="text-[8px] font-black text-emerald-600 uppercase tracking-tighter bg-emerald-50 px-1.5 py-0.5 rounded-md">IN OFFICE</span>
                                </div>
                            </div>
                        )) : (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400 border-2 border-dashed border-slate-100 rounded-3xl">
                                <Users className="w-10 h-10 mb-2 opacity-20" />
                                <p className="text-xs font-bold uppercase tracking-widest">No attendance logged yet</p>
                            </div>
                        )}
                    </div>

                    <button className="mt-6 w-full py-4 bg-slate-900 hover:bg-black text-white text-xs font-black rounded-2xl transition-all shadow-xl shadow-slate-200 uppercase tracking-[0.2em]">
                        View Full Logs
                    </button>
                </div>
            </div>

            {/* Quick Insights Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <BentoCard className="p-8 bg-slate-900 text-white border-none">
                    <BarChart3 className="w-10 h-10 text-teal-400 mb-6" />
                    <h4 className="text-lg font-black tracking-tight mb-2 text-white">Market Intelligence</h4>
                    <p className="text-sm text-slate-400 font-medium leading-relaxed">
                        Your current occupancy rate of {stats.occupancyRate}% is {Math.abs(stats.occupancyRate - 80)}% {stats.occupancyRate >= 80 ? 'above' : 'below'} the optimal 80% seasonal target.
                    </p>
                </BentoCard>

                <BentoCard className="p-8 bg-white border border-slate-200">
                    <UtensilsCrossed className="w-10 h-10 text-orange-500 mb-6" />
                    <h4 className="text-lg font-black tracking-tight mb-2 text-slate-900">POS Performance</h4>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">
                        Restaurant operations contributing {stats.todayRevenue > 0 ? Math.round((stats.restRevenue / stats.todayRevenue) * 100) : 0}% of total revenue today. Combined POS intake: {stats.restRevenue.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}.
                    </p>
                </BentoCard>

                <BentoCard className="p-8 bg-teal-600 text-white border-none">
                    <TrendingUp className="w-10 h-10 text-white mb-6" />
                    <h4 className="text-lg font-black tracking-tight mb-2 text-white">RevPAR Index</h4>
                    <p className="text-sm text-teal-50 font-medium leading-relaxed">
                        Revenue Per Available Room is {((stats.roomRevenue / (stats.totalRooms || 1))).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })} today. Current inventory: {stats.occupiedRooms} rooms active.
                    </p>
                </BentoCard>
            </div>
        </div>
    );
}
