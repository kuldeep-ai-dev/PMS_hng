'use client';

import {
    Users2, Timer, CheckCircle2, AlertCircle,
    UserCheck, Gauge, Zap, Trophy, History,
    Briefcase, ShieldUser
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

const STAFF_GUIDE = [
    {
        title: "Efficiency Metrics",
        description: "Cleanup efficiency is calculated by measuring the time elapsed between when a task is 'assigned' or 'started' and when it is marked as 'completed'.",
        details: ["Formula: Completed At - Assigned At", "Target: Under 30 mins for standard rooms"]
    },
    {
        title: "Completion Rate",
        description: "This reflects the percentage of assigned housekeeping tasks that were successfully completed within the selected 30-day window.",
        details: ["Includes: Routine cleaning and check-out prep", "Real-time: Updates as staff syncs their progress"]
    },
    {
        title: "Leaderboard Logic",
        description: "Rankings are based on a weighted combination of total tasks completed and average speed. High volume with consistency leads to top ranks.",
        details: ["Weighted: 60% Volume, 40% Speed", "Audit trail: Linked to 'cleaning_assignments' ledger"]
    }
];

export default function StaffDashboardClient({ data }: Props) {
    if (!data) return <div className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest bg-white rounded-3xl border border-dashed border-slate-200 uppercase tracking-widest">Gathering Performance Data...</div>;

    const {
        totalTasks, completedRate, avgCleanupTime,
        staffPerformance, efficiencyTrend, taskDistribution
    } = data;

    return (
        <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-20">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-6">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                            <div className="p-2.5 bg-violet-100 rounded-2xl shadow-sm">
                                <Users2 className="w-7 h-7 text-violet-600" />
                            </div>
                            Staff Performance
                        </h1>
                        <p className="text-sm text-slate-500 mt-2 font-medium uppercase tracking-wider">
                            Operational Efficiency and Productivity
                        </p>
                    </div>

                    <AnalyticsGuide
                        title="Staff Performance Guide"
                        subtitle="Understanding operational KPIs"
                        sections={STAFF_GUIDE}
                    />
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StaffKPICard
                    icon={Briefcase}
                    label="Total Tasks (30d)"
                    value={totalTasks}
                    status="Active"
                    color="text-slate-600"
                    bg="bg-slate-50"
                />
                <StaffKPICard
                    icon={Gauge}
                    label="Completion Rate"
                    value={`${completedRate}%`}
                    status={completedRate > 90 ? "Excellent" : "Good"}
                    color="text-emerald-600"
                    bg="bg-emerald-50"
                />
                <StaffKPICard
                    icon={Timer}
                    label="Avg. Cleanup"
                    value={`${avgCleanupTime}m`}
                    status="On Track"
                    color="text-blue-600"
                    bg="bg-blue-50"
                />
                <StaffKPICard
                    icon={Trophy}
                    label="Punctuality"
                    value="94%"
                    status="High"
                    color="text-amber-600"
                    bg="bg-amber-50"
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ChartCard title="Housekeeping Efficiency" subtitle="Avg minutes to complete cleaning" className="lg:col-span-2">
                    <RevenueAreaChart data={efficiencyTrend} dataKey="avg" color={COLORS.purple[0]} />
                </ChartCard>

                <ChartCard title="Task Distribution" subtitle="Status of current month tasks">
                    <DistributionPieChart data={taskDistribution} />
                </ChartCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Leaderboard Card */}
                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-all flex flex-col">
                    <h3 className="text-sm font-black text-slate-800 tracking-tight uppercase mb-6 flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-amber-500" />
                        Performance Leaderboard
                    </h3>
                    <div className="space-y-4 flex-1 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                        {staffPerformance.map((staff: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/50 border border-slate-100 hover:bg-white hover:shadow-sm transition-all">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black",
                                        idx === 0 ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-500"
                                    )}>
                                        #{idx + 1}
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-slate-800">{staff.name}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{staff.count} Tasks Completed</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Avg Time</p>
                                    <p className="text-sm font-black text-slate-700">{staff.avgMinutes}m</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <ChartCard title="Staff Volume Comparison" subtitle="Total tasks handled" className="lg:col-span-2">
                    <ComparisonBarChart
                        data={staffPerformance.map((s: any) => ({
                            date: s.name,
                            tasks: s.count
                        }))}
                        categories={[
                            { key: 'tasks', name: 'Tasks Handled', color: COLORS.primary[0] }
                        ]}
                    />
                </ChartCard>
            </div>

            {/* Gamification Placeholder */}
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute -bottom-10 -right-10 opacity-20">
                    <ShieldUser className="w-64 h-64" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="max-w-md">
                        <h3 className="text-2xl font-black tracking-tight mb-3">Employee of the Month</h3>
                        <p className="text-indigo-100 font-medium leading-relaxed mb-6">
                            Next reward will be announced in 12 days. Current top performer is based on cleanup speed and guest feedback consistency.
                        </p>
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                            <Zap className="w-4 h-4 text-amber-400" />
                            <span className="text-xs font-black uppercase tracking-widest text-white">Target: 25m Avg. Cleanup</span>
                        </div>
                    </div>

                    <div className="flex -space-x-4">
                        {[1, 2, 3, 4].map(idx => (
                            <div key={idx} className="w-16 h-16 rounded-2xl border-4 border-indigo-600 bg-slate-200 overflow-hidden shadow-xl hover:scale-110 hover:z-20 transition-all cursor-pointer ring-4 ring-white/5">
                                <img src={`https://i.pravatar.cc/150?u=${idx + 100}`} alt={`Staff ${idx}`} className="w-full h-full object-cover" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StaffKPICard({ icon: Icon, label, value, status, color, bg }: any) {
    return (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-4">
                <div className={cn("p-2.5 rounded-2xl transition-transform group-hover:scale-110", bg, color)}>
                    <Icon className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                    <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", color.replace('text', 'bg'))} />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{status}</span>
                </div>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{label}</p>
            <h4 className="text-2xl font-black text-slate-900 tracking-tight">{value}</h4>
        </div>
    );
}

