'use client';

import { useState } from 'react';
import { submitRenewalRequest } from '@/app/actions/license';
import {
    X,
    CreditCard,
    Hash,
    IndianRupee,
    Send,
    CheckCircle2,
    RefreshCcw
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface RenewalRequestFormProps {
    renewalAmount: number;
    onClose: () => void;
}

export default function RenewalRequestForm({ renewalAmount, onClose }: RenewalRequestFormProps) {
    const [amount, setAmount] = useState(renewalAmount.toString());
    const [txId, setTxId] = useState('');
    const [mode, setMode] = useState<'UPI' | 'Bank Transfer' | 'Cash' | 'Other'>('UPI');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!txId) return toast.error('Transaction ID is required');

        setSubmitting(true);
        const res = await submitRenewalRequest({
            amount: parseFloat(amount),
            transaction_id: txId,
            payment_mode: mode,
            hotel_name: 'Current Property' // Could be dynamic
        });

        if (res.success) {
            toast.success('Renewal request submitted successfully!');
            onClose();
        } else {
            toast.error(res.error || 'Failed to submit request');
        }
        setSubmitting(false);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-900 text-white rounded-2xl">
                            <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Request Renewal</h3>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Software Validity Extensions</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-4">
                        {/* Amount */}
                        <div className="space-y-2 opacity-80 cursor-not-allowed">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Fixed Renewal Amount (INR)</label>
                            <div className="relative group">
                                <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="number"
                                    value={amount}
                                    readOnly
                                    className="w-full bg-slate-100 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-slate-900 focus:ring-0 transition-all outline-none cursor-not-allowed"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <div className="px-2 py-0.5 bg-slate-900 text-white text-[8px] font-black rounded-lg uppercase tracking-widest">Fixed</div>
                                </div>
                            </div>
                        </div>

                        {/* Transaction ID */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Transaction ID / Reference</label>
                            <div className="relative group">
                                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Enter your payment reference"
                                    value={txId}
                                    onChange={(e) => setTxId(e.target.value)}
                                    required
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-slate-900 transition-all outline-none"
                                />
                            </div>
                        </div>

                        {/* Mode */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Payment Mode</label>
                            <div className="grid grid-cols-2 gap-3">
                                {['UPI', 'Bank Transfer', 'Cash', 'Other'].map((m) => (
                                    <button
                                        key={m}
                                        type="button"
                                        onClick={() => setMode(m as any)}
                                        className={cn(
                                            "py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
                                            mode === m
                                                ? "bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-200"
                                                : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                                        )}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-100 active:scale-95 disabled:opacity-50"
                    >
                        {submitting ? (
                            <RefreshCcw className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                        Submit Renewal Request
                    </button>
                </form>

                <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                        Requests are typically processed within 2-6 hours by the master authority.
                    </p>
                </div>
            </div>
        </div>
    );
}
