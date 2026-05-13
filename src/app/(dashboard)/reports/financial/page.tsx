'use client';

import { useState, useEffect } from 'react';
import { ReportsHeader } from '@/components/pms/ReportsHeader';
import { getFinancialReportData } from '@/app/actions/reports';
import { formatISTDate, formatISTTime, getTodayIST } from '@/utils/date';
import {
    Coins, TrendingUp, Receipt, Percent,
    ArrowUpRight, BarChart as BarIcon,
    Landmark, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';

const tabs = [
    { id: 'flash', label: "Manager's Flash", icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { id: 'transactions', label: 'Daily Transactions', icon: Receipt, color: 'text-teal-600', bg: 'bg-teal-50' },
    { id: 'tax', label: 'Tax Reports', icon: Landmark, color: 'text-rose-600', bg: 'bg-rose-50' },
];

const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount);
};

export default function FinancialReportsPage() {
    const [activeTab, setActiveTab] = useState('flash');
    const [date, setDate] = useState(getTodayIST());
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [activeTab, date]);

    async function fetchData() {
        setLoading(true);
        try {
            const result = await getFinancialReportData(activeTab, date);
            if (result.error) throw new Error(typeof result.error === 'string' ? result.error : (result.error as any).message || 'Failed to fetch data');
            setData(result.data);
        } catch (err: any) {
            toast.error(err.message || 'An error occurred');
            setData(null);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col gap-6">
                <ReportsHeader
                    title="Financial Reports"
                    description="Real-time revenue monitoring and fiscal health metrics"
                    currentDate={date}
                    onDateChange={setDate}
                />
                <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-2xl border border-slate-200">
                    <div className="w-8 h-8 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin" />
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Compiling {activeTab} Data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8">
            <ReportsHeader
                title="Financial Reports"
                description="Real-time revenue monitoring and fiscal health metrics"
                currentDate={date}
                onDateChange={setDate}
                onExport={() => window.print()}
            />

            {/* Tab Navigation */}
            <div className="flex overflow-x-auto gap-2 p-1 bg-slate-100/50 rounded-2xl w-fit border border-slate-200/60 no-scrollbar">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => {
                                if (activeTab === tab.id) return;
                                setLoading(true);
                                setActiveTab(tab.id);
                            }}
                            className={cn(
                                "flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shrink-0",
                                isActive
                                    ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                                    : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                            )}
                        >
                            <div className={cn("p-1.5 rounded-lg", isActive ? tab.bg : "bg-slate-200/50")}>
                                <Icon className={cn("w-4 h-4", isActive ? tab.color : "text-slate-400")} />
                            </div>
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {activeTab === 'flash' && data && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Performance Cards */}
                    <div className="lg:col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        {[
                            { label: 'Gross Revenue', value: formatPrice(data.totalRevenue), icon: Coins, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                            { label: 'Net Revenue', value: formatPrice(data.netRevenue), icon: TrendingUp, color: 'text-teal-600', bg: 'bg-teal-50' },
                            { label: 'Estimated Tax', value: formatPrice(data.gstAmount), icon: Receipt, color: 'text-rose-600', bg: 'bg-rose-50' },
                            { label: 'Occupancy', value: `${Math.round(data.occupancyRate)}%`, icon: Percent, color: 'text-blue-600', bg: 'bg-blue-50' },
                            { label: 'RevPAR', value: formatPrice(data.revPar), icon: BarIcon, color: 'text-amber-600', bg: 'bg-amber-50', sub: 'Revenue Per Room' },
                        ].map((stat, i) => (
                            <div key={i} className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm group hover:shadow-xl hover:shadow-slate-200/50 transition-all hover:-translate-y-0.5">
                                <div className={cn("p-2 rounded-xl w-fit mb-4", stat.bg)}>
                                    <stat.icon className={cn("w-4 h-4", stat.color)} />
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
                                <h3 className="text-xl font-black text-slate-900 tracking-tighter">{stat.value}</h3>
                            </div>
                        ))}
                    </div>

                    {/* Charts Row */}
                    <div className="lg:col-span-8 bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-lg font-black text-slate-800 tracking-tight leading-none mb-1">Revenue Breakdown</h3>
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">Source Distribution</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Room</span>
                                </div>
                                <div className="flex items-center gap-1.5 ml-3">
                                    <div className="w-3 h-3 rounded-full bg-indigo-500" />
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Restaurant</span>
                                </div>
                            </div>
                        </div>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={[
                                    { name: 'Room Revenue', amount: data.roomRevenue },
                                    { name: 'Restaurant Revenue', amount: data.restaurantRevenue }
                                ]}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" hide />
                                    <YAxis hide />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                                        formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, 'Amount']}
                                    />
                                    <Bar dataKey="amount" radius={[12, 12, 12, 12]} barSize={60}>
                                        <Cell fill="#10b981" />
                                        <Cell fill="#6366f1" />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="lg:col-span-4 bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm">
                        <h3 className="text-lg font-black text-slate-800 tracking-tight leading-none mb-1">Property Pulse</h3>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-8">Inventory Status</p>
                        <div className="h-[250px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'Occupied', value: data.occupiedRooms },
                                            { name: 'Available', value: data.totalRooms - data.occupiedRooms }
                                        ]}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        <Cell fill="#6366f1" />
                                        <Cell fill="#e2e8f0" />
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-2xl font-black text-slate-800">{Math.round(data.occupancyRate)}%</span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Occ Rate</span>
                            </div>
                        </div>
                        <div className="space-y-3 mt-4">
                            <div className="flex justify-between items-center px-4 py-3 bg-slate-50 rounded-xl">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Inventory</span>
                                <span className="text-sm font-black text-slate-800">{data.totalRooms} Rooms</span>
                            </div>
                            <div className="flex justify-between items-center px-4 py-3 bg-indigo-50 rounded-xl">
                                <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Sold Rooms</span>
                                <span className="text-sm font-black text-indigo-800">{data.occupiedRooms} Units</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'transactions' && data && (
                <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction Ref</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Guest / Room</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Method</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {Array.isArray(data) && data.map((item: any) => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-slate-800 uppercase tracking-tighter">#{item.id.slice(-8)}</span>
                                            <span className="text-[10px] font-bold text-slate-400">{formatISTTime(item.created_at)}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-800">{item.bookings?.guests?.name || 'Walk-in'}</span>
                                            <span className="text-[10px] font-black text-teal-600 uppercase">Room {item.bookings?.rooms?.number || 'POS'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1 px-2.5 bg-slate-100 rounded text-[10px] font-black text-slate-600 uppercase tracking-widest">{item.method}</div>
                                            {item.is_refund && <span className="text-[10px] font-black text-rose-500 uppercase">Refund</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={cn("text-sm font-black", item.is_refund ? "text-rose-600" : "text-emerald-600")}>
                                            {item.is_refund ? '-' : '+'}₹{Number(item.amount).toLocaleString()}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'tax' && data && (
                <div className="max-w-3xl">
                    <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 blur-[100px] rounded-full -mr-32 -mt-32" />

                        <div className="flex items-center gap-4 mb-10">
                            <div className="p-4 bg-rose-100 rounded-2xl">
                                <Landmark className="w-6 h-6 text-rose-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">GST & Tax Compliance</h3>
                                <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">Daily Legal Summary</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex justify-between items-center p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Gross Collection</p>
                                    <h4 className="text-2xl font-black text-slate-800 tracking-tighter">₹{data.totalRevenue?.toLocaleString() || '0'}</h4>
                                </div>
                                <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100">
                                    <Coins className="w-5 h-5 text-emerald-500" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="p-6 bg-rose-50/50 rounded-2xl border border-rose-100">
                                    <p className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em] mb-1">Total GST</p>
                                    <h4 className="text-xl font-black text-rose-600 tracking-tighter">₹{data.gstAmount?.toLocaleString() || '0'}</h4>
                                    <div className="flex gap-4 mt-2 border-t border-rose-200/50 pt-2">
                                        <div>
                                            <p className="text-[9px] font-black text-rose-400/80 uppercase">CGST</p>
                                            <p className="text-xs font-black text-rose-600/80">₹{data.cgst?.toLocaleString() || '0'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-rose-400/80 uppercase">SGST</p>
                                            <p className="text-xs font-black text-rose-600/80">₹{data.sgst?.toLocaleString() || '0'}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-1">Net Revenue</p>
                                    <h4 className="text-xl font-black text-emerald-600 tracking-tighter">₹{data.netRevenue?.toLocaleString() || '0'}</h4>
                                </div>
                            </div>
                        </div>

                        <div className="mt-10 p-5 bg-amber-50 rounded-2xl border border-amber-200">
                            <p className="text-xs font-bold text-amber-800 leading-relaxed">
                                <span className="flex items-center gap-2 mb-1">
                                    <AlertCircle className="w-4 h-4" /> Disclaimer
                                </span>
                                These tax figures are estimated based on total collection. For precise filing, consult your accountant or refer to the per-folio tax breakdown.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
