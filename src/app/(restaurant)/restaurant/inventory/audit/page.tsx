'use client';

import { useState, useEffect } from 'react';
import {
    ClipboardCheck,
    Plus,
    Search,
    ArrowLeft,
    Trash2,
    Save,
    AlertTriangle,
    History,
    Scale,
    CheckCircle2,
    BarChart3,
    RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import {
    getInventoryItems,
    recordWastage,
    getStockAudits,
    performStockAudit
} from '../actions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function AuditPage() {
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<any[]>([]);
    const [audits, setAudits] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'wastage' | 'audit'>('wastage');
    const [isSaving, setIsSaving] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Wastage Form
    const [wasteForm, setWasteForm] = useState({
        inventory_item_id: '',
        quantity: 0,
        reason: ''
    });

    // Audit Form
    const [auditForm, setAuditForm] = useState({
        item_id: '',
        actual_stock: 0,
        remarks: ''
    });

    useEffect(() => {
        setMounted(true);
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [itemList, auditList] = await Promise.all([
                getInventoryItems(),
                getStockAudits()
            ]);
            setItems(itemList);
            setAudits(auditList);
        } catch (error) {
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleRecordWastage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!wasteForm.inventory_item_id || wasteForm.quantity <= 0) {
            return toast.error('Please select an item and enter quantity');
        }
        setIsSaving(true);
        try {
            await recordWastage(wasteForm);
            toast.success('Wastage recorded and stock deducted');
            setWasteForm({ inventory_item_id: '', quantity: 0, reason: '' });
            loadData();
        } catch (error) {
            toast.error('Failed to record wastage');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePerformAudit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auditForm.item_id) return toast.error('Please select an item');
        setIsSaving(true);
        try {
            await performStockAudit(auditForm);
            toast.success('Audit completed. Stock levels reconciled.');
            setAuditForm({ item_id: '', actual_stock: 0, remarks: '' });
            loadData();
        } catch (error) {
            toast.error('Failed to perform audit');
        } finally {
            setIsSaving(false);
        }
    };

    const selectedAuditItem = items.find(i => i.id === auditForm.item_id);
    const discrepancy = selectedAuditItem ? auditForm.actual_stock - selectedAuditItem.current_stock : 0;

    if (loading || !mounted) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600"></div>
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
                        <h1 className="text-2xl font-black text-slate-900 leading-tight">Wastage & Audit</h1>
                        <p className="text-[10px] font-black uppercase tracking-widest text-rose-600 mt-1">Control Food Cost & Reconcile Stock</p>
                    </div>
                </div>

                <div className="flex p-1 bg-slate-100 rounded-2xl">
                    <button
                        onClick={() => setActiveTab('wastage')}
                        className={cn(
                            "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                            activeTab === 'wastage' ? "bg-white text-rose-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                        )}
                    >
                        Wastage Ledger
                    </button>
                    <button
                        onClick={() => setActiveTab('audit')}
                        className={cn(
                            "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                            activeTab === 'audit' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                        )}
                    >
                        Physical Audit
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left: Input Form */}
                <div className="lg:col-span-5">
                    {activeTab === 'wastage' ? (
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl space-y-6 animate-in slide-in-from-left-4">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600">
                                    <Trash2 className="w-6 h-6" />
                                </div>
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">Record Wastage</h2>
                            </div>

                            <form onSubmit={handleRecordWastage} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Ingredient</label>
                                    <select
                                        value={wasteForm.inventory_item_id}
                                        onChange={e => setWasteForm({ ...wasteForm, inventory_item_id: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-rose-500/10"
                                    >
                                        <option value="">-- Choose Item --</option>
                                        {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantity Wasted</label>
                                    <input
                                        type="number"
                                        step="0.001"
                                        required
                                        value={wasteForm.quantity}
                                        onChange={e => setWasteForm({ ...wasteForm, quantity: parseFloat(e.target.value) })}
                                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-rose-500/10"
                                        placeholder="0.00"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Reason for Waste</label>
                                    <textarea
                                        value={wasteForm.reason}
                                        onChange={e => setWasteForm({ ...wasteForm, reason: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold h-24 resize-none outline-none focus:ring-2 focus:ring-rose-500/10"
                                        placeholder="e.g. Expired, Spilled, Burnt..."
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="w-full py-5 bg-rose-600 text-white rounded-[20px] font-black text-sm shadow-xl shadow-rose-100 hover:bg-rose-700 transition-all flex items-center justify-center gap-2"
                                >
                                    {isSaving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    RECORD WASTAGE
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl space-y-6 animate-in slide-in-from-left-4">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                                    <Scale className="w-6 h-6" />
                                </div>
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">Stock Reconciliation</h2>
                            </div>

                            <form onSubmit={handlePerformAudit} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Item to Audit</label>
                                    <select
                                        value={auditForm.item_id}
                                        onChange={e => setAuditForm({ ...auditForm, item_id: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/10"
                                    >
                                        <option value="">-- Choose Item --</option>
                                        {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                                    </select>
                                </div>

                                {selectedAuditItem && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50 p-6 rounded-2xl">
                                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">System Stock</p>
                                            <p className="text-xl font-black text-slate-900">{selectedAuditItem.current_stock} <span className="text-[10px]">{selectedAuditItem.unit}</span></p>
                                        </div>
                                        <div className={cn(
                                            "p-6 rounded-2xl",
                                            discrepancy < 0 ? "bg-rose-50 text-rose-600" : discrepancy > 0 ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400"
                                        )}>
                                            <p className="text-[9px] font-black uppercase mb-1">Discrepancy</p>
                                            <p className="text-xl font-black">{discrepancy > 0 ? '+' : ''}{discrepancy}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Actual Physical Count</label>
                                    <input
                                        type="number"
                                        step="0.001"
                                        required
                                        value={auditForm.actual_stock}
                                        onChange={e => setAuditForm({ ...auditForm, actual_stock: parseFloat(e.target.value) })}
                                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-black focus:ring-2 focus:ring-indigo-500/10"
                                        placeholder="0.00"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Audit Remarks</label>
                                    <textarea
                                        value={auditForm.remarks}
                                        onChange={e => setAuditForm({ ...auditForm, remarks: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold h-24 resize-none outline-none focus:ring-2 focus:ring-indigo-500/10"
                                        placeholder="e.g. Broken packaging, Found in storage..."
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="w-full py-5 bg-indigo-600 text-white rounded-[20px] font-black text-sm shadow-xl shadow-indigo-100 hover:bg-slate-900 transition-all flex items-center justify-center gap-2"
                                >
                                    {isSaving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ClipboardCheck className="w-5 h-5" />}
                                    SUBMIT AUDIT REPORT
                                </button>
                            </form>
                        </div>
                    )}
                </div>

                {/* Right: History/Log */}
                <div className="lg:col-span-7">
                    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden min-h-[600px] flex flex-col">
                        <div className="p-8 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                                <History className="w-4 h-4 text-slate-400" />
                                Recent Activity Log
                            </h3>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {audits.map((audit) => (
                                <div key={audit.id} className="p-6 bg-white border border-slate-100 rounded-[2rem] hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                                <ClipboardCheck className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-slate-900">{audit.item?.name}</h4>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{format(new Date(audit.created_at), 'MMM dd, yyyy • h:mm a')}</p>
                                            </div>
                                        </div>
                                        <div className={cn(
                                            "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                                            audit.actual_stock > audit.opening_stock ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                                        )}>
                                            {audit.actual_stock - audit.opening_stock > 0 ? 'Surplus' : 'Deficit'}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 mb-4">
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Opening</p>
                                            <p className="text-sm font-bold text-slate-700">{audit.opening_stock} <span className="text-[10px]">{audit.item?.unit}</span></p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Physical</p>
                                            <p className="text-sm font-black text-slate-900">{audit.actual_stock} <span className="text-[10px]">{audit.item?.unit}</span></p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Diff</p>
                                            <p className={cn("text-sm font-black", (audit.actual_stock - audit.opening_stock) < 0 ? "text-rose-600" : "text-emerald-600")}>
                                                {audit.actual_stock - audit.opening_stock}
                                            </p>
                                        </div>
                                    </div>

                                    {audit.remarks && (
                                        <div className="p-3 bg-slate-50 rounded-xl text-[11px] font-medium text-slate-500 italic">
                                            "{audit.remarks}"
                                        </div>
                                    )}
                                </div>
                            ))}

                            {audits.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-center py-20 opacity-40">
                                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                                        <BarChart3 className="w-10 h-10 text-slate-300" />
                                    </div>
                                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest leading-relaxed">No audit logs available yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
