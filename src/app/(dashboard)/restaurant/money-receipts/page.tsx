'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Search,
    Filter,
    Download,
    Receipt as ReceiptIcon,
    Calendar,
    Wallet,
    CreditCard,
    ArrowUpRight,
    SearchX,
    RotateCcw,
    AlertCircle,
    Undo2,
    Loader2,
    X as CloseIcon
} from 'lucide-react';
import { getRestaurantMoneyReceiptsData, getRestaurantReceiptStats, processRestaurantRefund } from './actions';
import { formatCurrency } from '@/utils/billing';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';
import { RealtimeRefresh } from '@/components/pms/RealtimeRefresh';

export default function RestaurantMoneyReceiptsPage() {
    const [loading, setLoading] = useState(true);
    const [selectedRefund, setSelectedRefund] = useState<any>(null);
    const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
    const [refundReason, setRefundReason] = useState('Overpayment / Error');
    const [isProcessingRefund, setIsProcessingRefund] = useState(false);
    const [data, setData] = useState<any>({ posPayments: [] });
    const [stats, setStats] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterMethod, setFilterMethod] = useState('All');
    const [mounted, setMounted] = useState(false);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [receipts, statistics] = await Promise.all([
                getRestaurantMoneyReceiptsData(),
                getRestaurantReceiptStats()
            ]);
            setData(receipts);
            setStats(statistics);
        } catch (error) {
            toast.error('Failed to load restaurant receipts');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setMounted(true);
        loadData();

        // Realtime Subscription
        const supabase = createClient();
        const channel = supabase
            .channel('restaurant_receipts_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_orders' }, () => loadData())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [loadData]);

    // Normalize data for the table
    const allReceipts = data.posPayments.map((p: any) => {
        // Resolve the best possible guest name
        const dbCustomerName = p.restaurant_customers?.name;
        const pmsGuestName = p.guests?.name;
        const manualName = p.customer_name;
        const guestName = dbCustomerName || pmsGuestName || manualName || 'Walk-in';

        // Map order source for display
        let sourceLabel = 'POS Walk-in';
        if (p.order_source?.startsWith('qr_')) sourceLabel = 'QR Menu';
        else if (p.payment_status === 'charged_to_room') sourceLabel = 'Room Order';

        return {
            id: p.id,
            date: p.order_time,
            regnNo: p.bill_no ? `BILL-${p.bill_no}` : `ORD-${p.id.substring(0, 8).toUpperCase()}`,
            guestName,
            roomNo: p.rooms?.number || 'N/A',
            amount: p.total_amount,
            method: p.payment_status === 'charged_to_room' ? 'Room Credit' : 'Cash/Digital',
            status: p.is_refund ? 'Refunded' : (p.payment_status === 'paid' ? 'Paid' : p.payment_status === 'charged_to_room' ? 'Folio Charged' : 'Unpaid'),
            bookingId: p.booking_id,
            originalStatus: p.payment_status,
            sourceLabel
        };
    }).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const filteredReceipts = allReceipts.filter((r: any) => {
        const matchesSearch =
            r.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.regnNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.roomNo.toString().includes(searchTerm);

        const matchesMethod = filterMethod === 'All' ||
            (filterMethod === 'Room Credit' && r.originalStatus === 'charged_to_room') ||
            (filterMethod === 'POS' && r.originalStatus === 'paid');

        return matchesSearch && matchesMethod;
    });

    const getMethodIcon = (method: string) => {
        if (method === 'Room Credit') return <CreditCard className="w-3.5 h-3.5" />;
        return <Wallet className="w-3.5 h-3.5" />;
    };

    if (loading || !mounted) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8 p-4 md:p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Restaurant Money Receipts</h1>
                    <p className="text-slate-500 mt-1">Audit trail for all restaurant collections & bills</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={loadData}
                        className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-all font-medium text-sm shadow-sm active:scale-95"
                    >
                        <Calendar className="w-4 h-4" />
                        Refresh Today
                    </button>
                    <RealtimeRefresh />
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-500 text-sm font-medium">Today's Restaurant Total</span>
                        <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                            <ArrowUpRight className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{formatCurrency(stats?.todayTotal || 0)}</div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-500 text-sm font-medium">Room Credits Today</span>
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                            <CreditCard className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{formatCurrency(stats?.folioCollection || 0)}</div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-500 text-sm font-medium">Direct POS Today</span>
                        <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                            <Wallet className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{formatCurrency(stats?.posCollection || 0)}</div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-500 text-sm font-medium">Order Count</span>
                        <div className="p-2 bg-slate-50 rounded-lg text-slate-600">
                            <ReceiptIcon className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{stats?.orderCount || 0}</div>
                </div>
            </div>

            {/* Filter Controls */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[300px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by Guest, Room, or Order No..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500 transition-all outline-none"
                    />
                </div>

                <select
                    value={filterMethod}
                    onChange={(e) => setFilterMethod(e.target.value)}
                    className="px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium text-slate-600 focus:ring-2 focus:ring-teal-500 transition-all outline-none cursor-pointer"
                >
                    <option value="All">All Transactions</option>
                    <option value="POS">Direct Payments Only</option>
                    <option value="Room Credit">Room Credits Only</option>
                </select>
            </div>

            {/* Main Table */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Date & Bill No</th>
                                <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Guest Name</th>
                                <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Source</th>
                                <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Room / Entity</th>
                                <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">Amount</th>
                                <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Type</th>
                                <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Status</th>
                                <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredReceipts.map((receipt: any) => (
                                <tr key={receipt.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-900 group-hover:text-teal-600 transition-colors">{receipt.regnNo}</span>
                                            <span className="text-[11px] text-slate-400 font-medium">
                                                {new Date(receipt.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className="text-sm font-semibold text-slate-700">{receipt.guestName}</span>
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        <div className={cn(
                                            "inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter shadow-sm",
                                            receipt.sourceLabel === 'QR Menu' ? "bg-purple-50 text-purple-600 border border-purple-100" :
                                                receipt.sourceLabel === 'Room Order' ? "bg-indigo-50 text-indigo-600 border border-indigo-100" :
                                                    "bg-slate-50 text-slate-600 border border-slate-100"
                                        )}>
                                            {receipt.sourceLabel}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className={cn(
                                            "inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold",
                                            receipt.roomNo === 'N/A' ? "bg-slate-100 text-slate-500" : "bg-teal-50 text-teal-700"
                                        )}>
                                            {receipt.roomNo === 'N/A' ? 'Walk-in' : `Room ${receipt.roomNo}`}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 text-right font-bold text-slate-900 text-lg">
                                        {formatCurrency(receipt.amount)}
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2">
                                            <span className="p-1.5 bg-slate-100 rounded-md text-slate-500">
                                                {getMethodIcon(receipt.method)}
                                            </span>
                                            <span className="text-xs font-semibold text-slate-600">{receipt.method}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        <span className={cn(
                                            "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm",
                                            receipt.status === 'Paid' || receipt.status === 'Folio Charged'
                                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                                : receipt.status === 'Refunded'
                                                    ? "bg-red-50 text-red-700 border border-red-100"
                                                    : "bg-amber-50 text-amber-700 border border-amber-100" // Unpaid/Partial
                                        )}>
                                            {receipt.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                title="Print Bill"
                                                onClick={() => window.open(`/print-pos-bill/${receipt.id}`, '_blank')}
                                                className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all"
                                            >
                                                <ReceiptIcon className="w-4 h-4" />
                                            </button>

                                            {receipt.status !== 'Refunded' && (
                                                <button
                                                    title="Process Refund"
                                                    onClick={() => {
                                                        setSelectedRefund(receipt);
                                                        setIsRefundModalOpen(true);
                                                    }}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                >
                                                    <Undo2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredReceipts.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 bg-slate-50/20">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                                <SearchX className="w-8 h-8 text-slate-200" />
                            </div>
                            <h3 className="text-slate-900 font-semibold">No restaurant receipts found</h3>
                            <p className="text-slate-400 text-sm">Try adjusting your filters or search term</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Refund Modal */}
            {isRefundModalOpen && selectedRefund && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3 text-red-600">
                                <RotateCcw className="w-5 h-5" />
                                <h3 className="font-black text-lg tracking-tight">Process Restaurant Refund</h3>
                            </div>
                            <button
                                onClick={() => setIsRefundModalOpen(false)}
                                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                            >
                                <CloseIcon className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction Info</span>
                                    <span className={cn(
                                        "text-[10px] font-black px-2 py-0.5 rounded-full uppercase",
                                        selectedRefund.method === 'Room Credit' ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                                    )}>{selectedRefund.method}</span>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="font-bold text-slate-900">{selectedRefund.regnNo}</p>
                                        <p className="text-xs text-slate-500 font-medium">{selectedRefund.guestName}</p>
                                    </div>
                                    <p className="font-black text-xl text-slate-900">{formatCurrency(selectedRefund.amount)}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    Refund Reason
                                </label>
                                <div className="grid grid-cols-1 gap-2">
                                    {['Overpayment / Error', 'Order Cancellation', 'Service Issue', 'Other'].map((reason) => (
                                        <button
                                            key={reason}
                                            onClick={() => setRefundReason(reason)}
                                            className={cn(
                                                "w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all border",
                                                refundReason === reason
                                                    ? "bg-red-50 border-red-200 text-red-700 shadow-sm"
                                                    : "bg-white border-slate-200 text-slate-600 hover:border-red-200"
                                            )}
                                        >
                                            {reason}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex gap-3">
                            <button
                                onClick={() => setIsRefundModalOpen(false)}
                                className="flex-1 px-4 py-3 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={isProcessingRefund}
                                onClick={async () => {
                                    setIsProcessingRefund(true);
                                    try {
                                        const result = await processRestaurantRefund(
                                            selectedRefund.id,
                                            selectedRefund.amount,
                                            refundReason
                                        );
                                        if (result.success) {
                                            toast.success('Refund processed successfully!');
                                            setIsRefundModalOpen(false);
                                            loadData();
                                        } else {
                                            toast.error(`Refund failed: ${result.message}`);
                                        }
                                    } catch (err) {
                                        toast.error('Failed to process refund');
                                    } finally {
                                        setIsProcessingRefund(false);
                                    }
                                }}
                                className="flex-1 px-4 py-3 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-200 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isProcessingRefund ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                                Confirm Refund
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
