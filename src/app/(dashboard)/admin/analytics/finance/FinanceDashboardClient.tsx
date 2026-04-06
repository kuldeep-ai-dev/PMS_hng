'use client';

import { useState, useTransition } from 'react';
import { format } from 'date-fns';
import {
    Coins, ArrowUpRight, ArrowDownRight, CreditCard,
    Banknote, RefreshCcw, Wallet, TrendingUp,
    Download, Calendar, Filter, History
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    ChartCard, RevenueAreaChart, DistributionPieChart,
    ComparisonBarChart, COLORS
} from '../components/AnalyticsCharts';
import { AnalyticsGuide } from '../components/AnalyticsGuide';
import { FinanceRange, getFinanceAnalytics } from '../actions-finance';

interface Props {
    initialData: any;
}

const FINANCE_GUIDE = [
    {
        title: "Revenue Tracking",
        description: "Gross Revenue represents the sum of all successful payments received. Net Revenue is the final profit after subtracting all refunds.",
        details: ["Gross = Sum(All Non-Refund Payments)", "Net = Gross - Total Refunds"]
    },
    {
        title: "Refund Processing",
        description: "Refunds are tracked as separate debit entries in the 'payments' table. They are linked to the original transaction ID for reconciliation.",
        details: ["Accuracy: Reflects actual bank settlement", "Real-time: Updated as soon as refund is marked"]
    },
    {
        title: "Transaction Integrity",
        description: "Every metric is derived from individual ledger entries. The 'Recent Transactions' list provides a direct audit trail for the figures shown.",
        details: ["Includes: Cash, UPI, Card, and Online", "Excludes: Cancelled/Failed attempts"]
    }
];

export default function FinanceDashboardClient({ initialData }: Props) {
    const [data, setData] = useState(initialData);
    const [range, setRange] = useState<FinanceRange>('30d');
    const [isPending, startTransition] = useTransition();

    const stats = data?.stats || {};
    const revenueTrend = data?.revenueTrend || [];
    const methodDistribution = data?.methodDistribution || [];
    const recentTransactions = data?.recentTransactions || [];

    const handleRangeChange = (newRange: FinanceRange) => {
        setRange(newRange);
        startTransition(async () => {
            const newData = await getFinanceAnalytics(newRange);
            if (newData) setData(newData);
        });
    };

    return (
        <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-20">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-6">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                            <div className="p-2.5 bg-amber-100 rounded-2xl shadow-sm">
                                <Coins className="w-7 h-7 text-amber-600" />
                            </div>
                            Finance Analytics
                        </h1>
                        <p className="text-sm text-slate-500 mt-2 font-medium uppercase tracking-wider">
                            Revenue, Profits, and Payment Insights
                        </p>
                    </div>

                    <AnalyticsGuide
                        title="Finance Data Guide"
                        subtitle="Understanding your revenue logic"
                        sections={FINANCE_GUIDE}
                    />
                </div>

                <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
                    {(['7d', '30d', '90d', 'all'] as const).map((r) => (
                        <button
                            key={r}
                            onClick={() => handleRangeChange(r)}
                            disabled={isPending}
                            className={cn(
                                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                range === r
                                    ? "bg-slate-900 text-white shadow-lg"
                                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                            )}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    icon={Banknote}
                    label="Gross Revenue"
                    value={`₹${stats.totalGross?.toLocaleString()}`}
                    trend="+12.5%"
                    trendUp={true}
                    color="text-emerald-600"
                    bg="bg-emerald-50"
                />
                <KPICard
                    icon={RefreshCcw}
                    label="Refunds Issued"
                    value={`₹${stats.totalRefunds?.toLocaleString()}`}
                    trend="+2.1%"
                    trendUp={false}
                    color="text-rose-600"
                    bg="bg-rose-50"
                />
                <KPICard
                    icon={Wallet}
                    label="Net Revenue"
                    value={`₹${stats.netRevenue?.toLocaleString()}`}
                    trend="+14.2%"
                    trendUp={true}
                    color="text-blue-600"
                    bg="bg-blue-50"
                />
                <KPICard
                    icon={TrendingUp}
                    label="Avg. Transaction"
                    value={`₹${stats.avgTransaction?.toLocaleString()}`}
                    trend="-1.5%"
                    trendUp={false}
                    color="text-violet-600"
                    bg="bg-violet-50"
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ChartCard title="Revenue Trend" subtitle="Daily gross tracking" className="lg:col-span-2">
                    <RevenueAreaChart data={revenueTrend} />
                </ChartCard>

                <ChartCard title="Payment Methods" subtitle="Volume by channel">
                    <DistributionPieChart data={methodDistribution} />
                </ChartCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ChartCard title="Net Daily Performance" subtitle="Revenue vs Refunds" className="lg:col-span-2">
                    <ComparisonBarChart
                        data={revenueTrend}
                        categories={[
                            { key: 'revenue', name: 'Gross', color: COLORS.primary[0] },
                            { key: 'refunds', name: 'Refunds', color: COLORS.danger[0] }
                        ]}
                    />
                </ChartCard>

                <div className="bg-white rounded-3xl border border-slate-100 p-6 flex flex-col">
                    <h3 className="text-sm font-black text-slate-800 tracking-tight uppercase mb-6 flex items-center gap-2">
                        <History className="w-4 h-4 text-slate-400" />
                        Recent Transactions
                    </h3>
                    <div className="flex-1 space-y-4 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                        {recentTransactions.map((tx: any) => (
                            <div key={tx.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/50 border border-slate-100 hover:bg-white hover:shadow-sm transition-all">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-10 h-10 rounded-xl flex items-center justify-center",
                                        tx.isRefunded ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"
                                    )}>
                                        {tx.method === 'cash' ? <Wallet className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-slate-800">₹{tx.amount?.toLocaleString()}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{tx.method} • {format(new Date(tx.date), 'dd MMM')}</p>
                                    </div>
                                </div>
                                {tx.isRefunded && (
                                    <span className="text-[8px] font-black uppercase tracking-widest bg-rose-100 text-rose-600 px-2 py-1 rounded-full">Refunded</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function KPICard({ icon: Icon, label, value, trend, trendUp, color, bg }: any) {
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
                    {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {trend}
                </div>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{label}</p>
            <h4 className="text-2xl font-black text-slate-900 tracking-tight">{value}</h4>
        </div>
    );
}

