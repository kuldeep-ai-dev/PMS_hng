'use client';

import React from 'react';
import {
    Zap, TrendingUp, BarChart3, LineChart,
    ArrowUpRight, ArrowDownRight, Globe,
    Users, PieChart, Sparkles, Target,
    Rocket, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    ChartCard, RevenueAreaChart, DistributionPieChart,
    ComparisonBarChart, COLORS
} from '../components/AnalyticsCharts';
import { AnalyticsGuide } from '../components/AnalyticsGuide';
import { GrowthStrategyModal } from '../components/GrowthStrategyModal';

interface Props {
    data: any;
}

const GROWTH_GUIDE = [
    {
        title: "Commercial KPIs (RevPAR & ADR)",
        description: "ADR (Avg Daily Rate) is the revenue earned per occupied room. RevPAR (Revenue Per Available Room) measures total revenue against all primary inventory.",
        details: ["ADR = Room Revenue / Rooms Sold", "RevPAR = Room Revenue / Total Inventory"]
    },
    {
        title: "Guest Retention Rate",
        description: "This traces the percentage of 'Repeat Guests' in your database. A guest is considered 'Repeated' if they have more than one booking record.",
        details: ["Calculation: (Repeat Guests / Unique Guests) * 100", "Data Source: 'guests' table linked to 'bookings'"]
    },
    {
        title: "Growth Projections",
        description: "Monthly trends are aggregated based on check-in volume. Figures account for settled bills only to ensure fiscal accuracy.",
        details: ["Updated: Real-time upon booking settlement", "Basis: Revenue from 'total_bill' field"]
    }
];

export default function GrowthDashboardClient({ data }: Props) {
    const [isStrategyOpen, setIsStrategyOpen] = React.useState(false);

    if (!data) return <div className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest bg-white rounded-3xl border border-dashed border-slate-200 uppercase tracking-widest">Gathering Growth Data...</div>;

    const {
        adr, revpar, retentionRate,
        monthlyGrowth, guestStats
    } = data;

    return (
        <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-20">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-6">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                            <div className="p-2.5 bg-indigo-100 rounded-2xl shadow-sm">
                                <Zap className="w-7 h-7 text-indigo-600" />
                            </div>
                            Business Growth
                        </h1>
                        <p className="text-sm text-slate-500 mt-2 font-medium uppercase tracking-wider">
                            Commercial Health and Guest Retention
                        </p>
                    </div>

                    <AnalyticsGuide
                        title="Business Growth Guide"
                        subtitle="Understanding commercial performance"
                        sections={GROWTH_GUIDE}
                    />
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <GrowthKPICard
                    icon={Target}
                    label="Current ADR"
                    value={`₹${adr.toLocaleString()}`}
                    trend="+8%"
                    trendUp={true}
                    color="text-sky-600"
                    bg="bg-sky-50"
                />
                <GrowthKPICard
                    icon={Rocket}
                    label="Current RevPAR"
                    value={`₹${revpar.toLocaleString()}`}
                    trend="+15%"
                    trendUp={true}
                    color="text-indigo-600"
                    bg="bg-indigo-50"
                />
                <GrowthKPICard
                    icon={Users}
                    label="Guest Retention"
                    value={`${retentionRate}%`}
                    trend="+2.5%"
                    trendUp={true}
                    color="text-emerald-600"
                    bg="bg-emerald-50"
                />
                <GrowthKPICard
                    icon={TrendingUp}
                    label="Annual Growth"
                    value="+24%"
                    trend="+4.2%"
                    trendUp={true}
                    color="text-violet-600"
                    bg="bg-violet-50"
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ChartCard title="RevPAR vs ADR Momentum" subtitle="Monthly revenue & rate trends" className="lg:col-span-2">
                    <ComparisonBarChart
                        data={monthlyGrowth}
                        categories={[
                            { key: 'revpar', name: 'RevPAR', color: COLORS.info[0] },
                            { key: 'adr', name: 'ADR', color: COLORS.purple[0] }
                        ]}
                    />
                </ChartCard>

                <ChartCard title="Guest Loyalty" subtitle="Repeat vs New guest base">
                    <DistributionPieChart data={guestStats} />
                </ChartCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard title="Revenue Growth Trajectory" subtitle="Total monthly gross revenue tracking" className="lg:col-span-1">
                    <RevenueAreaChart data={monthlyGrowth} dataKey="revenue" color={COLORS.primary[0]} />
                </ChartCard>

                <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm hover:shadow-md transition-all flex flex-col relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform">
                        <Rocket className="w-48 h-48 text-sky-600" />
                    </div>
                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center gap-2 mb-6">
                            <Sparkles className="w-5 h-5 text-sky-500" />
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">Expansion Goals 2026</h3>
                        </div>

                        <div className="space-y-6 flex-1">
                            <GoalItem label="RevPAR Target" current="₹1,240" target="₹1,500" progress={82} color="bg-sky-500" />
                            <GoalItem label="Guest Retention" current="18%" target="25%" progress={72} color="bg-indigo-500" />
                            <GoalItem label="Direct Bookings" current="64%" target="80%" progress={80} color="bg-emerald-500" />
                        </div>

                        <button
                            onClick={() => setIsStrategyOpen(true)}
                            className="mt-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-slate-900 transition-colors"
                        >
                            Explore Growth Strategy
                            <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>

            <GrowthStrategyModal
                isOpen={isStrategyOpen}
                onClose={() => setIsStrategyOpen(false)}
                currentStats={{ adr, revpar, retention: retentionRate }}
            />

            {/* Market Comparison Placeholder */}
            <div className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="max-w-md">
                        <h3 className="text-lg font-black text-slate-800 tracking-tight mb-2">Market Benchmark Analysis</h3>
                        <p className="text-sm text-slate-500 leading-relaxed font-medium">
                            Your ADR is currently 14% higher than the local market average, while your RevPAR is leading by 8.4%. This suggests a premium positioning with room for occupancy growth.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm text-center">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Local ADR</p>
                            <p className="font-black text-slate-800">₹2,840</p>
                        </div>
                        <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm text-center">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Local RevPAR</p>
                            <p className="font-black text-slate-800">₹1,120</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function GrowthKPICard({ icon: Icon, label, value, trend, trendUp, color, bg }: any) {
    return (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-4">
                <div className={cn("p-2.5 rounded-2xl transition-transform group-hover:scale-110 shadow-sm", bg, color)}>
                    <Icon className="w-5 h-5" />
                </div>
                <div className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black tracking-widest",
                    trendUp ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                )}>
                    {trend}
                </div>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{label}</p>
            <h4 className="text-2xl font-black text-slate-900 tracking-tight">{value}</h4>
        </div>
    );
}

function GoalItem({ label, current, target, progress, color }: any) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                <span className="text-slate-500">{label}</span>
                <span className="text-slate-800">{current} / <span className="text-slate-400">{target}</span></span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                    className={cn("h-full rounded-full transition-all duration-1000", color)}
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
}
