'use client';

import { useState, useEffect } from 'react';
import {
    Search,
    Filter,
    Download,
    Receipt as ReceiptIcon,
    Calendar,
    ChevronDown,
    Wallet,
    CreditCard,
    Building2,
    ArrowUpRight,
    SearchX,
    RotateCcw,
    AlertCircle,
    CheckCircle2,
    Undo2
} from 'lucide-react';
import { getMoneyReceiptsData, getReceiptStats, processRefund, settlePOSWithRestaurant } from './actions';
import { generateInvoiceNo, formatCurrency } from '@/utils/billing';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';
import { RealtimeRefresh } from '@/components/pms/RealtimeRefresh';

export default function MoneyReceiptsPage() {
    const [loading, setLoading] = useState(true);
    const [filtering, setFiltering] = useState(false);
    const [selectedRefund, setSelectedRefund] = useState<any>(null);
    const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
    const [refundReason, setRefundReason] = useState('Overpayment / Error');
    const [isProcessingRefund, setIsProcessingRefund] = useState(false);
    const [data, setData] = useState<any>({ roomPayments: [], posPayments: [] });
    const [stats, setStats] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterMethod, setFilterMethod] = useState('All');
    const [filterSource, setFilterSource] = useState('All');

    useEffect(() => {
        loadData();

        // Realtime Subscription
        const supabase = createClient();
        const channel = supabase
            .channel('money_receipts_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => loadData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_orders' }, () => loadData())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [receipts, statistics] = await Promise.all([
                getMoneyReceiptsData(),
                getReceiptStats()
            ]);
            setData(receipts);
            setStats(statistics);
        } catch (error) {
            toast.error('Failed to load money receipts');
        } finally {
            setLoading(false);
        }
    };

    // Combine and normalize data for the table
    const allReceipts = [
        ...data.roomPayments.map((p: any) => ({
            id: p.id,
            date: p.created_at,
            regnNo: generateInvoiceNo(p.booking_id, p.bookings?.check_in_date || p.created_at),
            guestName: p.bookings?.guests?.name || 'Unknown',
            roomNo: p.bookings?.rooms?.number || 'N/A',
            source: 'Room Booking',
            amount: p.amount,
            method: p.method,
            status: p.is_refund
                ? 'Refunded'
                : p.bookings?.is_settled
                    ? 'Settled'
                    : p.bookings?.status === 'Checked_Out'
                        ? (p.bookings?.bill_to_company ? 'Pending Settlement' : 'Paid')
                        : p.bookings?.status === 'Checked_In'
                            ? 'In-House Payment'
                            : 'Advance Deposit',
            bookingId: p.booking_id,
            company: p.bookings?.companies?.name
        })),
        ...data.posPayments.map((p: any) => ({
            id: p.id,
            date: p.order_time,
            regnNo: p.bill_no ? `BILL-${p.bill_no}` : generateInvoiceNo(p.id, p.order_time),
            guestName: p.guests?.name || p.customer_name || 'Walk-in',
            roomNo: p.rooms?.number || 'N/A',
            source: 'Restaurant POS',
            amount: p.total_amount,
            method: p.payment_status === 'charged_to_room' ? 'Billed to Folio' : (p.payment_mode || 'Paid'),
            status: p.is_refund ? 'Refunded' : 'Paid',
            isSettled: p.is_settled_with_restaurant,
            bookingId: p.booking_id,
            company: null
        }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const filteredReceipts = allReceipts.filter(r => {
        const matchesSearch =
            r.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.regnNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.roomNo.toString().includes(searchTerm);

        const matchesMethod = filterMethod === 'All' || r.method === filterMethod;
        const matchesSource = filterSource === 'All' || r.source === filterSource;

        return matchesSearch && matchesMethod && matchesSource;
    });

    const getMethodIcon = (method: string) => {
        if (method === 'Cash') return <Wallet className="w-3.5 h-3.5" />;
        if (method === 'Card') return <CreditCard className="w-3.5 h-3.5" />;
        return <ArrowUpRight className="w-3.5 h-3.5" />;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 p-4 md:p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
            {/* Print Styles */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page { margin: 15mm; size: landscape; }
                    body { background: white !important; -webkit-print-color-adjust: exact; }
                    .no-print { display: none !important; }
                    .print-only { display: block !important; }
                    .sidebar-nav, .sidebar, aside, nav, button { display: none !important; }
                    .print-container { padding: 0 !important; border: none !important; box-shadow: none !important; }
                    table { width: 100% !important; border-collapse: collapse !important; border: 1px solid #e2e8f0 !important; }
                    th, td { border: 1px solid #e2e8f0 !important; padding: 10px !important; font-size: 9pt !important; }
                    th { background-color: #f8fafc !important; color: #475569 !important; font-weight: bold !important; }
                    .status-badge { padding: 2px 6px !important; border: 1px solid #e2e8f0 !important; border-radius: 4px !important; }
                }
                .print-only { display: none; }
            `}} />

            {/* Print-Only Header */}
            <div className="print-only mb-8 text-center border-b pb-6">
                <h1 className="text-2xl font-black text-slate-900 mb-1 uppercase tracking-tight">Money Receipt Audit Report</h1>
                <p className="text-sm text-slate-500 font-medium italic">Comprehensive Transaction Ledger for Hotel New Ganga</p>
                <div className="flex items-center justify-center gap-4 mt-3 text-xs font-bold text-slate-400">
                    <span>Generated on: {new Date().toLocaleString('en-IN')}</span>
                    <span>•</span>
                    <span>Source: Geny PMS Pro Central Audit</span>
                </div>
            </div>

            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Money Receipts</h1>
                    <p className="text-slate-500 mt-1">Full accounting audit & transaction history</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            const params = new URLSearchParams({
                                search: searchTerm,
                                method: filterMethod,
                                source: filterSource,
                                _token: '__geny_pms_internal_pdf_2026__'
                            });
                            window.open(`/print-receipts?${params.toString()}`, '_blank');
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition-all font-medium text-sm shadow-sm"
                    >
                        <Download className="w-4 h-4" />
                        Export PDF
                    </button>
                    <button
                        onClick={loadData}
                        className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-all font-medium text-sm shadow-sm active:scale-95"
                    >
                        <Calendar className="w-4 h-4" />
                        Refresh Today
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-500 text-sm font-medium">Today's Collection</span>
                        <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                            <ArrowUpRight className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{formatCurrency(stats?.todayTotal || 0)}</div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-500 text-sm font-medium">Room Payments</span>
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                            <Building2 className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{formatCurrency(stats?.roomCollection || 0)}</div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-500 text-sm font-medium">Billed to Folio (POS)</span>
                        <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                            <ReceiptIcon className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{formatCurrency(stats?.posCollection || 0)}</div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-500 text-sm font-medium">Active Receipts</span>
                        <div className="p-2 bg-slate-50 rounded-lg text-slate-600">
                            <Calendar className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{filteredReceipts.length}</div>
                </div>
            </div>

            {/* Filter Controls */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[300px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by Guest, Room, or Invoice No..."
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
                    <option value="All">All Methods</option>
                    <option value="Cash">Cash Only</option>
                    <option value="UPI">UPI / Digital</option>
                    <option value="Card">Card</option>
                    <option value="Billed to Folio">Billed to Folio</option>
                    <option value="Corporate">Corporate Ledger</option>
                </select>

                <select
                    value={filterSource}
                    onChange={(e) => setFilterSource(e.target.value)}
                    className="px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium text-slate-600 focus:ring-2 focus:ring-teal-500 transition-all outline-none cursor-pointer"
                >
                    <option value="All">All Sources</option>
                    <option value="Room Booking">Room Booking</option>
                    <option value="Restaurant POS">Restaurant POS</option>
                </select>
            </div>

            {/* Main Table */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Date & Invoice No</th>
                                <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Guest / Entity</th>
                                <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Room</th>
                                <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Source</th>
                                <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">Amount</th>
                                <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Method</th>
                                <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredReceipts.map((receipt) => (
                                <tr key={receipt.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-900 group-hover:text-teal-600 transition-colors">{receipt.regnNo}</span>
                                            <span className="text-[11px] text-slate-400 font-medium">
                                                {new Date(receipt.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold text-slate-700">{receipt.guestName}</span>
                                            {receipt.company && (
                                                <span className="text-[10px] text-teal-600 font-bold uppercase tracking-tight">{receipt.company}</span>
                                            )}
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
                                    <td className="px-6 py-5">
                                        <span className="text-xs font-medium text-slate-500">{receipt.source}</span>
                                    </td>
                                    <td className="px-6 py-5 text-right font-bold text-slate-900">
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
                                    <td className="px-6 py-5">
                                        <span className={cn(
                                            "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm",
                                            receipt.status === 'Paid' || receipt.status === 'Settled'
                                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                                : receipt.status === 'Refunded'
                                                    ? "bg-red-50 text-red-700 border border-red-100"
                                                    : "bg-amber-50 text-amber-700 border border-amber-100"
                                        )}>
                                            {receipt.status === 'Refunded' && <RotateCcw className="w-2.5 h-2.5 mr-1" />}
                                            {receipt.status === 'Refunded' ? 'Refunded' : 'Paid'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-2">
                                            {/* POS Settlement button removed per user request - Folio charges are settled at checkout */}

                                            <button
                                                title="Print Bill"
                                                onClick={() => {
                                                    if (receipt.source === 'Restaurant POS') {
                                                        window.open(`/print-pos-bill/${receipt.id}`, '_blank');
                                                    } else if (receipt.bookingId) {
                                                        window.open(`/print-bill/${receipt.bookingId}`, '_blank');
                                                    }
                                                }}
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
                            <h3 className="text-slate-900 font-semibold">No money receipts found</h3>
                            <p className="text-slate-400 text-sm">Try adjusting your filters or search term</p>
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setFilterMethod('All');
                                    setFilterSource('All');
                                }}
                                className="mt-4 text-teal-600 font-semibold hover:underline text-sm"
                            >
                                Clear all filters
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer / Pagination Placeholder */}
                <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">
                        Showing {filteredReceipts.length} of {allReceipts.length} transactions
                    </span>
                    <div className="flex items-center gap-2">
                        <button disabled className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-400">Prev</button>
                        <button disabled className="px-3 py-1 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-teal-600 shadow-sm">1</button>
                        <button disabled className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-400">Next</button>
                    </div>
                </div>
            </div>

            {/* Print-Only Footer */}
            <div className="print-only mt-12 pt-8 border-t border-slate-200">
                <div className="flex justify-between items-start">
                    <div className="space-y-4">
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">System Certified by</span>
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded bg-teal-600 flex items-center justify-center text-white text-[10px] font-bold">G</div>
                                <span className="text-sm font-bold text-slate-800 tracking-tight">Geny PMS Pro</span>
                            </div>
                        </div>
                        <p className="text-[9px] text-slate-400 font-medium">
                            This is a computer-generated audit report. No manual signature is required for digital verification.<br />
                            © {new Date().getFullYear()} MediaGeny Tech Solutions. All rights reserved.
                        </p>
                    </div>

                    <div className="text-right space-y-6">
                        <div className="inline-block border-b border-slate-300 w-48 h-12"></div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Authorized Signatory / Auditor</p>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-[10px] font-black text-teal-700 uppercase tracking-[0.2em] opacity-40">
                        Powered by Geny PMS Pro unit of MediaGeny
                    </p>
                </div>
            </div>

            {/* Refund Modal */}
            {isRefundModalOpen && selectedRefund && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3 text-red-600">
                                <RotateCcw className="w-5 h-5" />
                                <h3 className="font-black text-lg tracking-tight">Process Refund</h3>
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
                                    <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase">{selectedRefund.source}</span>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="font-bold text-slate-900">{selectedRefund.regnNo || 'POS-Order'}</p>
                                        <p className="text-xs text-slate-500 font-medium">{selectedRefund.guestName}</p>
                                    </div>
                                    <p className="font-black text-xl text-slate-900">{formatCurrency(selectedRefund.amount)}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    Select Refund Reason
                                    <AlertCircle className="w-3 h-3 text-slate-400" />
                                </label>
                                <div className="grid grid-cols-1 gap-2">
                                    {[
                                        'Guest Cancellation',
                                        'Overpayment / Error',
                                        'Room Change / Downgrade',
                                        'Service Quality Issue',
                                        'Duplicate Entry',
                                        'Other'
                                    ].map((reason) => (
                                        <button
                                            key={reason}
                                            onClick={() => setRefundReason(reason)}
                                            className={cn(
                                                "w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all border",
                                                refundReason === reason
                                                    ? "bg-red-50 border-red-200 text-red-700 shadow-sm"
                                                    : "bg-white border-slate-200 text-slate-600 hover:border-red-200 hover:bg-red-50/30"
                                            )}
                                        >
                                            {reason}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <p className="text-[10px] text-slate-400 font-medium leading-relaxed italic text-center">
                                Processing this refund will log a reverse entry in the system to maintain a complete audit trail.
                            </p>
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
                                        const result = await processRefund(
                                            selectedRefund.id,
                                            selectedRefund.source,
                                            selectedRefund.amount,
                                            refundReason,
                                            { bookingId: selectedRefund.bookingId }
                                        );
                                        if (result.success) {
                                            toast.success('Refund processed successfully!');
                                            setIsRefundModalOpen(false);
                                            window.location.reload(); // Quick refresh
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

// Simple Loader icon as it might be missing
const Loader2 = ({ className }: { className: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
);

const CloseIcon = ({ className }: { className: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
);
