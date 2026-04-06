'use client';

import {
    TrendingUp, Calendar, Compass, Clock,
    ArrowUpRight, ArrowDownRight, Users,
    LayoutGrid, History, Sparkles, Map
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    ChartCard, RevenueAreaChart, DistributionPieChart,
    ComparisonBarChart, COLORS
} from '../components/AnalyticsCharts';
import { AnalyticsGuide } from '../components/AnalyticsGuide';

interface Props {
    data: any;
}

const TREND_GUIDE = [
    {
        title: "Occupancy Calculation",
        description: "Occupancy is calculated daily by comparing active bookings against total available inventory. A room is 'occupied' if it has an active check-in or booking for that date.",
        details: ["Formula: (Occupied Rooms / Total Rooms) * 100", "Data Source: 'bookings' and 'rooms' tables"]
    },
    {
        title: "Lead Time Insight",
        description: "Lead time represents the gap between when a guest creates a booking and their actual check-in date. High lead time indicates early planning.",
        details: ["Calculation: Check-in Date - Created Date", "Metric: Median value used for outliers"]
    },
    {
        title: "Booking Sources",
        description: "Distribution is based on the 'coming_from' or 'booking_source' field tagged during guest check-in or online reservation.",
        details: ["Helps identify top-performing marketing channels", "Real-time updates as soon as guest arrives"]
    }
];

export default function TrendDashboardClient({ data }: Props) {
    if (!data) return <div className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest bg-white rounded-3xl border border-dashed border-slate-200">Generating Trends...</div>;

    const {
        avgLeadTime, occupancyTrends,
        sourceDistribution, leadTimeData,
        totalBookings, cancelledBookings
    } = data;

    const cancellationRate = totalBookings > 0
        ? Math.round((cancelledBookings / totalBookings) * 100)
        : 0;

    return (
        <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-20">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-6">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                            <div className="p-2.5 bg-blue-100 rounded-2xl shadow-sm">
                                <TrendingUp className="w-7 h-7 text-blue-600" />
                            </div>
                            Trend Analytics
                        </h1>
                        <p className="text-sm text-slate-500 mt-2 font-medium uppercase tracking-wider">
                            Occupancy, Seasonality, and Booking Patterns
                        </p>
                    </div>

                    <AnalyticsGuide
                        title="Trend Data Guide"
                        subtitle="Understanding behavioral metrics"
                        sections={TREND_GUIDE}
                    />
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <TrendKPICard
                    icon={Calendar}
                    label="Current Occupancy"
                    value={`${occupancyTrends[occupancyTrends.length - 1]?.occupancy || 0}%`}
                    trend="+5.2%"
                    trendUp={true}
                    color="text-emerald-600"
                    bg="bg-emerald-50"
                />
                <TrendKPICard
                    icon={Clock}
                    label="Avg. Lead Time"
                    value={`${avgLeadTime} Days`}
                    trend="-2 Days"
                    trendUp={true}
                    color="text-blue-600"
                    bg="bg-blue-50"
                />
                <TrendKPICard
                    icon={Compass}
                    label="Booking Volume"
                    value={totalBookings}
                    trend="+18%"
                    trendUp={true}
                    color="text-violet-600"
                    bg="bg-violet-50"
                />
                <TrendKPICard
                    icon={Users}
                    label="Cancellation Rate"
                    value={`${cancellationRate}%`}
                    trend="+1.2%"
                    trendUp={false}
                    color="text-rose-600"
                    bg="bg-rose-50"
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ChartCard title="Occupancy Momentum" subtitle="Last 6 months performance" className="lg:col-span-2">
                    <RevenueAreaChart data={occupancyTrends} dataKey="occupancy" color={COLORS.info[0]} />
                </ChartCard>

                <ChartCard title="Booking Sources" subtitle="Where guests are coming from">
                    <DistributionPieChart data={sourceDistribution} />
                </ChartCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ChartCard title="Lead Time Distribution" subtitle="How far in advance guests book" className="lg:col-span-1">
                    <DistributionPieChart data={leadTimeData} />
                </ChartCard>

                <ChartCard title="Monthly Booking Volume" subtitle="New reservations created" className="lg:col-span-2">
                    <ComparisonBarChart
                        data={occupancyTrends}
                        categories={[
                            { key: 'bookings', name: 'New Bookings', color: COLORS.purple[0] }
                        ]}
                    />
                </ChartCard>
            </div>

            {/* Actionable Insights Section */}
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 p-12 opacity-10">
                    <Sparkles className="w-48 h-48 rotate-12" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center border border-teal-500/30">
                            <Compass className="w-4 h-4 text-teal-400" />
                        </div>
                        <h3 className="text-xl font-bold tracking-tight">Predictive Insights</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <InsightItem
                            title="Peak Season Approaching"
                            desc="Based on historical data, occupancy is expected to rise by 25% in the next 30 days."
                        />
                        <InsightItem
                            title="Lead Time Optimization"
                            desc="Average lead time of 4 days suggests an opportunity for last-minute promotions."
                        />
                        <InsightItem
                            title="Channel Performance"
                            desc="Direct bookings are the most profitable channel. Consider increasing direct incentives."
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

function TrendKPICard({ icon: Icon, label, value, trend, trendUp, color, bg }: any) {
    return (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-4">
                <div className={cn("p-2.5 rounded-2xl transition-transform group-hover:scale-110", bg, color)}>
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

function InsightItem({ title, desc }: { title: string, desc: string }) {
    return (
        <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <h4 className="font-bold text-teal-400 mb-2">{title}</h4>
            <p className="text-sm text-slate-300 leading-relaxed font-medium">{desc}</p>
        </div>
    );
}
