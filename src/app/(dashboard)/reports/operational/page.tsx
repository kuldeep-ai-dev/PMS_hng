'use client';

import { useState, useEffect } from 'react';
import { ReportsHeader } from '@/components/pms/ReportsHeader';
import { getOperationalReportData } from '@/app/actions/reports';
import { formatISTDate, formatISTTime, getTodayIST } from '@/utils/date';
import {
    Users, LogIn, LogOut, AlertCircle, Brush,
    Search, Phone
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const tabs = [
    { id: 'arrivals', label: 'Arrivals', icon: LogIn, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'departures', label: 'Departures', icon: LogOut, color: 'text-rose-600', bg: 'bg-rose-50' },
    { id: 'in-house', label: 'In-House', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'no-shows', label: 'No-Shows', icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'housekeeping', label: 'Housekeeping', icon: Brush, color: 'text-indigo-600', bg: 'bg-indigo-50' },
];

export default function OperationalReportsPage() {
    const [activeTab, setActiveTab] = useState('arrivals');
    const [date, setDate] = useState(getTodayIST());
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchData();
    }, [activeTab, date]);

    async function fetchData() {
        setLoading(true);
        try {
            const result = await getOperationalReportData(activeTab, date);
            if (result.error) throw new Error(typeof result.error === 'string' ? result.error : (result.error as any).message || 'Failed to fetch data');
            setData(result.data || []);
        } catch (err: any) {
            toast.error(err.message || 'An error occurred');
            setData([]);
        } finally {
            setLoading(false);
        }
    }

    const filteredData = data.filter(item => {
        const search = searchTerm.toLowerCase();
        if (activeTab === 'housekeeping') {
            return item.number.toString().includes(search) || item.type.toLowerCase().includes(search);
        }
        return (
            item.guests?.name?.toLowerCase().includes(search) ||
            item.guests?.phone?.includes(search) ||
            item.rooms?.number?.toString().includes(search)
        );
    });

    return (
        <div className="flex flex-col gap-6">
            <ReportsHeader
                title="Operational Reports"
                description="Live guest lifecycle and property status tracking"
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

            {/* Search and Filters */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    type="text"
                    placeholder={`Search ${activeTab === 'housekeeping' ? 'room' : 'guest'}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium"
                />
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="w-8 h-8 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin" />
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Generating {activeTab} Report...</p>
                    </div>
                ) : filteredData.length > 0 ? (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200">
                                {activeTab === 'housekeeping' ? (
                                    <>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Room Number</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Last Cleaned</th>
                                    </>
                                ) : (
                                    <>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Guest Details</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Room</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Status</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredData.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                                    {activeTab === 'housekeeping' ? (
                                        <>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-700 shadow-sm border border-slate-200">
                                                        {item.number}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 space-y-0.5">
                                                <p className="text-sm font-bold text-slate-700">{item.type}</p>
                                                <p className="text-xs font-medium text-slate-400 capitalize">{item.category}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    "inline-flex items-center px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider",
                                                    item.status === 'Available' ? "bg-emerald-50 text-emerald-600" :
                                                        item.status === 'Occupied' ? "bg-blue-50 text-blue-600" :
                                                            item.status === 'Dirty' ? "bg-amber-50 text-amber-600" :
                                                                "bg-rose-50 text-rose-600"
                                                )}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <p className="text-sm font-bold text-slate-600">{formatISTTime(item.last_cleaned_at) || 'Never'}</p>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <p className="text-sm font-bold text-slate-800">{item.guests?.name}</p>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400 tracking-tight">
                                                            <Phone className="w-3 h-3" /> {item.guests?.phone || 'N/A'}
                                                        </span>
                                                        {item.is_vip && (
                                                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-black uppercase rounded tracking-widest border border-amber-200/50">VIP</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="inline-flex items-center px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-xs font-black shadow-sm">
                                                    {item.rooms?.number || 'N/A'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <p className="text-sm font-bold text-slate-600">
                                                        {formatISTDate(activeTab === 'arrivals' ? item.check_in_date : item.check_out_date, 'dashboard')}
                                                    </p>
                                                    {item.pending_balance > 0 && (
                                                        <p className="text-[10px] font-bold text-rose-500 uppercase tracking-tighter">Bal: ₹{item.pending_balance}</p>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={cn(
                                                    "inline-flex items-center px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider",
                                                    item.status === 'Active' ? "bg-emerald-50 text-emerald-600" :
                                                        item.status === 'Confirmed' ? "bg-blue-50 text-blue-600" :
                                                            item.status === 'No_Show' ? "bg-rose-50 text-rose-600" :
                                                                "bg-slate-100 text-slate-500"
                                                )}>
                                                    {item.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-400 bg-slate-50/50">
                        {(() => {
                            const TabIcon = tabs.find(t => t.id === activeTab)?.icon || AlertCircle;
                            return <TabIcon className="w-12 h-12 mb-4 opacity-20" />;
                        })()}
                        <p className="text-lg font-black text-slate-400 uppercase tracking-widest">No data available</p>
                        <p className="text-sm font-medium opacity-60">There are no {activeTab} for the selected date.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
