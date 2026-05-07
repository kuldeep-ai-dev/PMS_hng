'use client';

import { useState } from 'react';
import { Download, FileText, DownloadCloud, Receipt, Building2, CheckSquare } from 'lucide-react';
import { formatCurrency } from '@/utils/billing';
import { formatISTDate } from '@/utils/date';
import { cn } from '@/lib/utils';
import { toast, Toaster } from 'sonner';

export default function AccountsPortalClient({
    receipts,
    startDate,
    endDate,
    hotelName,
    accountsToken
}: {
    receipts: any[];
    startDate: string;
    endDate: string;
    hotelName: string;
    accountsToken: string;
}) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [downloading, setDownloading] = useState(false);

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === receipts.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(receipts.map(r => r.id)));
    };

    const handleIndividualDownload = (receipt: any) => {
        const baseUrl = receipt.downloadType === 'bill'
            ? `/print-bill/${receipt.downloadId}`
            : `/print-pos-bill/${receipt.downloadId}`;
        // Pass the verified accounts token as a query param for the print page auth
        const authUrl = `${baseUrl}?accounts_token=${encodeURIComponent(accountsToken)}`;
        window.open(authUrl, '_blank');
    };

    const downloadSelected = async () => {
        if (selectedIds.size === 0) return toast.error('No receipts selected');
        setDownloading(true);
        toast.info(`Triggering ${selectedIds.size} downloads... (Please allow popups)`);

        const selected = receipts.filter(r => selectedIds.has(r.id));

        for (let i = 0; i < selected.length; i++) {
            setTimeout(() => {
                handleIndividualDownload(selected[i]);
            }, i * 800); // 800ms delay between opens to prevent aggressive popup blocking
        }

        setTimeout(() => setDownloading(false), selected.length * 800);
    };

    const downloadAll = () => {
        setSelectedIds(new Set(receipts.map(r => r.id)));
        setTimeout(() => {
            // Reusing selected function logic since state update is async
            if (receipts.length === 0) return toast.error('No receipts to download');
            setDownloading(true);
            toast.info(`Triggering ${receipts.length} downloads... (Please allow popups)`);
            for (let i = 0; i < receipts.length; i++) {
                setTimeout(() => handleIndividualDownload(receipts[i]), i * 800);
            }
            setTimeout(() => setDownloading(false), receipts.length * 800);
        }, 100);
    };

    const totalAmount = receipts.reduce((sum, r) => sum + Number(r.amount), 0);

    return (
        <div className="min-h-screen bg-slate-50 relative pb-20">
            <Toaster position="top-center" richColors />

            {/* Header */}
            <div className="bg-indigo-900 text-white pt-12 pb-24 px-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
                <div className="max-w-6xl mx-auto relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-indigo-100 text-xs font-bold mb-4 uppercase tracking-widest border border-white/10">
                                <FileText className="w-3.5 h-3.5" />
                                Secure Accounts Portal
                            </div>
                            <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-2">Audit Ledger</h1>
                            <p className="text-indigo-200 font-medium text-lg">{hotelName}</p>
                        </div>
                        <div className="bg-white/10 p-5 rounded-2xl backdrop-blur-md border border-white/10 shrink-0">
                            <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1">Time Period</p>
                            <p className="text-xl font-bold">{formatISTDate(startDate)} <span className="opacity-50 mx-2">to</span> {formatISTDate(endDate)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto px-4 -mt-10 relative z-20">
                <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                    {/* Toolbar */}
                    <div className="p-4 border-b border-slate-100 bg-slate-50/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={toggleSelectAll}
                                className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                                <CheckSquare className="w-4 h-4" />
                                {selectedIds.size === receipts.length ? 'Deselect All' : 'Select All'}
                            </button>
                            {selectedIds.size > 0 && (
                                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                                    {selectedIds.size} Selected
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                disabled={downloading || selectedIds.size === 0}
                                onClick={downloadSelected}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all font-bold text-sm shadow-sm disabled:opacity-50"
                            >
                                <Download className="w-4 h-4" />
                                Download Selected
                            </button>
                            <button
                                disabled={downloading || receipts.length === 0}
                                onClick={downloadAll}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-bold text-sm shadow-sm hover:shadow-indigo-200 disabled:opacity-50"
                            >
                                <DownloadCloud className="w-4 h-4" />
                                Download All
                            </button>
                        </div>
                    </div>

                    {/* Summary row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 lg:p-6 bg-slate-50/30 border-b border-slate-100">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Transactions</p>
                            <p className="text-xl font-black text-slate-800">{receipts.length}</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Revenue Volume</p>
                            <p className="text-xl font-black text-emerald-600">{formatCurrency(totalAmount)}</p>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="w-12 px-6 py-4"></th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Date / Invoice</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Category</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Amount</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status / Method</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-widest">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {receipts.map(receipt => (
                                    <tr
                                        key={receipt.id}
                                        onClick={() => toggleSelect(receipt.id)}
                                        className={cn(
                                            "transition-colors cursor-pointer group",
                                            selectedIds.has(receipt.id) ? "bg-indigo-50/50" : "hover:bg-slate-50/50"
                                        )}
                                    >
                                        <td className="px-6 py-4">
                                            <div className={cn(
                                                "w-5 h-5 rounded flex items-center justify-center border transition-all",
                                                selectedIds.has(receipt.id) ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-300 group-hover:border-indigo-400"
                                            )}>
                                                {selectedIds.has(receipt.id) && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{receipt.regnNo}</div>
                                            <div className="text-xs text-slate-500 font-medium">{formatISTDate(receipt.date)}</div>
                                            <div className="text-xs font-semibold text-slate-600 mt-1">{receipt.guestName}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold",
                                                receipt.type === 'Room' ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"
                                            )}>
                                                {receipt.type === 'Room' ? <Building2 className="w-3 h-3" /> : <Receipt className="w-3 h-3" />}
                                                {receipt.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-black text-slate-900">
                                            {formatCurrency(receipt.amount)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1 items-start">
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider",
                                                    receipt.status === 'Paid' ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                                                )}>
                                                    {receipt.status}
                                                </span>
                                                <span className="text-xs font-medium text-slate-500">{receipt.method}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleIndividualDownload(receipt);
                                                }}
                                                className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg border border-transparent hover:border-indigo-100 shadow-sm hover:shadow transition-all"
                                                title="View / Download PDF"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {receipts.length === 0 && (
                            <div className="text-center py-24 text-slate-500">
                                <FileText className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                <h3 className="text-lg font-bold text-slate-800">No Transactions Found</h3>
                                <p className="text-sm mt-1">No receipts or invoices were generated within this period.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="text-center mt-8 space-y-1 opacity-70">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Secured by Geny PMS Pro</p>
                    <p className="text-[10px] text-slate-400">Data provided is exactly as recorded by the property.</p>
                </div>
            </div>
        </div>
    );
}
