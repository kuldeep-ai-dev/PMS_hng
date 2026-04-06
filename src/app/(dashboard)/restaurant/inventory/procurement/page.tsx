'use client';

import { useState, useEffect } from 'react';
import {
    ShoppingCart,
    Plus,
    Search,
    ArrowLeft,
    Calendar,
    User,
    CheckCircle2,
    Clock,
    XCircle,
    ChevronDown,
    FileText,
    Truck,
    PackageCheck
} from 'lucide-react';
import Link from 'next/link';
import { getPurchaseOrders, receivePurchaseOrder } from '../actions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function ProcurementPage() {
    const [loading, setLoading] = useState(true);
    const [pos, setPos] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedPO, setExpandedPO] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await getPurchaseOrders();
            setPos(data);
        } catch (error) {
            toast.error('Failed to load purchase orders');
        } finally {
            setLoading(false);
        }
    };

    const handleReceivePO = async (id: string) => {
        if (!confirm('Mark this PO as received? This will automatically add items to your inventory stock.')) return;

        try {
            toast.loading('Processing GRN and updating stock...');
            await receivePurchaseOrder(id);
            toast.dismiss();
            toast.success('Goods received successfully. Stock updated.');
            loadData();
        } catch (error) {
            toast.dismiss();
            toast.error('Failed to process receipt');
        }
    };

    const statusColors: any = {
        draft: 'bg-slate-100 text-slate-600',
        sent: 'bg-orange-100 text-orange-600',
        received: 'bg-emerald-100 text-emerald-600',
        cancelled: 'bg-rose-100 text-rose-600'
    };

    const filteredPOs = pos.filter(po =>
        po.vendor?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading || !mounted) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 p-4 md:p-8 max-w-[1400px] mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/restaurant/inventory" className="p-3 bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors shadow-sm">
                        <ArrowLeft className="w-5 h-5 text-slate-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 leading-tight">Procurement & POs</h1>
                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-600 mt-1">Track Orders & Goods Received Notes (GRN)</p>
                    </div>
                </div>

                <Link
                    href="/restaurant/inventory/procurement/new"
                    className="bg-orange-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-lg shadow-orange-100 hover:bg-orange-700 transition-all flex items-center justify-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    CREATE PURCHASE ORDER
                </Link>
            </div>

            {/* Search */}
            <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input
                        type="text"
                        placeholder="Search POs by Vendor or Order ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-orange-500/20 transition-all outline-none"
                    />
                </div>
            </div>

            {/* PO List */}
            <div className="space-y-4">
                {filteredPOs.map((po) => (
                    <div key={po.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden transition-all hover:shadow-md">
                        <div className="p-8 flex flex-wrap items-center justify-between gap-6">
                            <div className="flex items-center gap-6">
                                <div className={cn(
                                    "w-16 h-16 rounded-[1.5rem] flex items-center justify-center",
                                    po.status === 'received' ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"
                                )}>
                                    {po.status === 'received' ? <PackageCheck className="w-8 h-8" /> : <Truck className="w-8 h-8" />}
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">{po.vendor?.name}</h3>
                                    <div className="flex items-center gap-3 mt-1 text-slate-400">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5" />
                                            <span className="text-[10px] font-bold uppercase tracking-tight">{format(new Date(po.created_at), 'MMM dd, h:mm a')}</span>
                                        </div>
                                        <div className="w-1 h-1 bg-slate-200 rounded-full" />
                                        <span className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">ID: #{po.id.slice(0, 8)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-12">
                                <div className="text-center">
                                    <div className="text-2xl font-black text-slate-900 tracking-tighter">₹{po.total_amount.toLocaleString()}</div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Value</p>
                                </div>

                                <div className={cn(
                                    "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.1em]",
                                    statusColors[po.status]
                                )}>
                                    {po.status}
                                </div>

                                <div className="flex items-center gap-2">
                                    {po.status === 'sent' && (
                                        <button
                                            onClick={() => handleReceivePO(po.id)}
                                            className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                                        >
                                            Receive GRN
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setExpandedPO(expandedPO === po.id ? null : po.id)}
                                        className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 transition-colors"
                                    >
                                        <ChevronDown className={cn("w-5 h-5 transition-transform", expandedPO === po.id && "rotate-180")} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Expanded Items details */}
                        {expandedPO === po.id && (
                            <div className="px-8 pb-8 animate-in slide-in-from-top-4 duration-300">
                                <div className="bg-slate-50/50 rounded-[2rem] border border-slate-100 overflow-hidden">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-slate-100">
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Item Name</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-center">Ordered Qty</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-center">Unit Price</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-right">Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {po.items.map((item: any, idx: number) => (
                                                <tr key={idx}>
                                                    <td className="px-6 py-4">
                                                        <span className="text-sm font-bold text-slate-700">{item.item?.name}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="text-sm font-black text-slate-900">{item.quantity}</span>
                                                        <span className="text-[10px] ml-1 text-slate-400 uppercase font-bold">{item.item?.unit}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="text-sm font-bold text-slate-600">₹{item.unit_price}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className="text-sm font-black text-slate-900">₹{(item.quantity * item.unit_price).toLocaleString()}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-slate-100/50 font-black">
                                                <td colSpan={3} className="px-6 py-4 text-right text-[10px] uppercase tracking-widest text-slate-400">Grand Total</td>
                                                <td className="px-6 py-4 text-right text-lg tracking-tighter text-slate-900">₹{po.total_amount.toLocaleString()}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {filteredPOs.length === 0 && (
                    <div className="py-24 flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                            <ShoppingCart className="w-10 h-10 text-slate-200" />
                        </div>
                        <h3 className="text-lg font-black text-slate-900">No Purchase Orders Found</h3>
                        <p className="text-slate-400 text-sm max-w-[280px] mt-2 font-medium">Create your first PO to start professional inventory procurement.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
