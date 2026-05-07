'use client';

import { useState, useEffect } from 'react';
import { getOrderHistory } from './actions';
import { BentoCard } from '@/components/ui/BentoCard';
import { Search, Calendar, Receipt, Printer, User, Home, Hash, ArrowUpDown, Filter, ChevronRight, CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function OrderHistory() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState<'today' | 'all'>('today');

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const filters: any = { searchQuery };
            if (dateFilter === 'today') {
                const today = new Date();
                const start = new Date(today.setHours(0, 0, 0, 0)).toISOString();
                const end = new Date(today.setHours(23, 59, 59, 999)).toISOString();
                filters.startDate = start;
                filters.endDate = end;
            }
            const data = await getOrderHistory(filters);
            setOrders(data);
        } catch (err) {
            toast.error('Failed to fetch history');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [dateFilter]);

    const handlePrint = (id: string) => {
        window.open(`/print-pos-bill/${id}`, '_blank');
    };

    return (
        <div className="flex flex-col gap-8 w-full max-w-[1600px] mx-auto pb-20 px-4 md:px-6">
            {/* Header section with Stats */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-slate-900 rounded-[28px] flex items-center justify-center text-teal-400 shadow-xl shadow-slate-200">
                        <Receipt className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-[32px] font-black text-slate-900 leading-tight tracking-tight">Order History</h1>
                        <p className="text-slate-500 font-medium mt-1">Audit trail of all past restaurant & room transactions.</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex p-1 bg-slate-100 rounded-2xl">
                        {(['today', 'all'] as const).map(type => (
                            <button
                                key={type}
                                onClick={() => setDateFilter(type)}
                                className={cn(
                                    "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                    dateFilter === type ? "bg-white text-slate-900 shadow-md" : "text-slate-500 hover:text-slate-900"
                                )}
                            >
                                {type}
                            </button>
                        ))}
                    </div>

                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search bill no or guest..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchHistory()}
                            className="pl-12 pr-6 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all text-sm font-bold min-w-[280px]"
                        />
                    </div>
                </div>
            </div>

            {/* List View */}
            <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
                <div className="max-h-[650px] overflow-y-auto overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
                            <tr className="border-b border-slate-100">
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Bill Info</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Guest / Location</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Items Detail</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-8 py-8 h-20 bg-slate-50/20" />
                                    </tr>
                                ))
                            ) : orders.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-8 py-20 text-center text-slate-400 font-bold">No history records found.</td>
                                </tr>
                            ) : (
                                orders.map((order) => (
                                    <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-slate-900 flex items-center gap-2">
                                                    #{order.bill_no}
                                                    <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-black text-slate-500 uppercase">{order.order_source.replace('_', ' ')}</span>
                                                </span>
                                                <span className="text-xs font-bold text-slate-400 mt-1 flex items-center gap-1.5 underline decoration-slate-200">
                                                    <Clock className="w-3 h-3" />
                                                    {format(new Date(order.order_time), 'MMM dd, hh:mm a')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                                    <User className="w-3.5 h-3.5 text-slate-400" />
                                                    {order.customer_name || order.guest?.name || 'Walk-in'}
                                                </span>
                                                <span className="text-xs font-bold text-slate-400 mt-1 flex items-center gap-1.5">
                                                    <Home className="w-3.5 h-3.5" />
                                                    {order.room?.number ? `Room ${order.room.number}` : order.table?.table_number ? `Table ${order.table.table_number}` : 'POS Counter'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 max-w-[300px]">
                                            <div className="flex flex-wrap gap-1.5">
                                                {order.items?.map((item: any, idx: number) => (
                                                    <span key={idx} className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 whitespace-nowrap">
                                                        {item.quantity}x {item.item?.name}
                                                    </span>
                                                ))}
                                                {order.items?.length > 2 && <span className="text-[10px] font-black text-slate-400">+{order.items.length - 2} more</span>}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className={cn("px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm",
                                                    order.payment_status === 'paid' ? "bg-emerald-500 text-white" : "bg-blue-500 text-white")}>
                                                    {order.payment_status === 'paid' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                                                    {order.payment_mode || 'Cash'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <span className="text-lg font-black text-slate-900 tracking-tight">₹{order.total_amount}</span>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <button
                                                onClick={() => handlePrint(order.id)}
                                                className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-slate-900 hover:border-slate-400 transition-all active:scale-95 shadow-sm"
                                                title="Print Bill"
                                            >
                                                <Printer className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
