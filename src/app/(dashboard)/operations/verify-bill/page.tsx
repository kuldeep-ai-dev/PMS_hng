'use client';

import { useState } from 'react';
import {
    ShieldCheck, ShieldAlert, Search, FileText,
    Calendar, User, Home, Banknote, Loader2,
    ArrowLeft, Printer, Info, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { verifyBill } from './actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

import { BentoCard } from '@/components/ui/BentoCard';

export default function VerifyBillPage() {
    const [regnNo, setRegnNo] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [searched, setSearched] = useState(false);
    const router = useRouter();

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!regnNo.trim()) return;

        setLoading(true);
        setSearched(true);
        setResult(null);

        try {
            const data = await verifyBill(regnNo.trim().toUpperCase());
            setResult(data);
            if (data) {
                toast.success('Bill Verified');
            } else {
                toast.error('Invalid Registration Number');
            }
        } catch (err: any) {
            toast.error(err.message || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    const sym = '₹';

    return (
        <div className="max-w-4xl mx-auto flex flex-col gap-6 pb-20 mt-4 px-4">
            {/* Header Area */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        Bill Verification
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Verify the authenticity of guest bills and receipts
                    </p>
                </div>
            </div>

            {/* Verification Form */}
            <BentoCard className="p-8">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-teal-50 rounded-xl">
                        <ShieldCheck className="w-6 h-6 text-teal-600" />
                    </div>
                    <div>
                        <h2 className="font-bold text-slate-900 text-lg">Identity Authenticator</h2>
                        <p className="text-sm text-slate-500">Enter the Registration Number from the printed bill</p>
                    </div>
                </div>

                <form onSubmit={handleVerify} className="space-y-4 max-w-2xl">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            value={regnNo}
                            onChange={(e) => setRegnNo(e.target.value)}
                            placeholder="e.g. INV-YYYYMMDD-XXXX"
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all uppercase"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading || !regnNo}
                        className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-slate-800 disabled:opacity-30 transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify Registration"}
                    </button>
                </form>
            </BentoCard>

            {/* Verification Result */}
            {searched && !loading && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                    {result ? (
                        <div className="space-y-6">
                            {/* Success Alert */}
                            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex items-center gap-4">
                                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                                    <ShieldCheck className="w-7 h-7 text-emerald-600" />
                                </div>
                                <div>
                                    <h3 className="text-emerald-900 font-bold">Successfully Verified</h3>
                                    <p className="text-emerald-700 text-sm">This record is authentic and matches the secure property ledger.</p>
                                </div>
                            </div>

                            {/* Details Card */}
                            <BentoCard className="overflow-hidden">
                                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Validated Record Details</h4>
                                    <div className="flex items-center gap-2 px-2 py-0.5 bg-teal-100 text-teal-700 rounded text-[10px] font-bold">
                                        TRUSTED SOURCE
                                    </div>
                                </div>
                                <div className="p-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Main Guest</p>
                                            <p className="text-xl font-bold text-slate-900">{result.guests?.name}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Room Allocation</p>
                                            <p className="text-xl font-bold text-slate-900">Room {result.rooms?.number} ({result.rooms?.type})</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stay Duration</p>
                                            <p className="text-sm font-semibold text-slate-600">
                                                {new Date(result.check_in_date).toLocaleDateString()} — {new Date(result.check_out_date).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Settled Amount</p>
                                            <p className="text-2xl font-black text-slate-900 tracking-tighter">
                                                {sym}{Number(result.advance_payment || 0 + (result.payments?.reduce((s: number, p: any) => s + Number(p.amount), 0) || 0)).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-12 pt-8 border-t border-slate-100 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                                                {result.guests?.name?.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-900">Digital Seal Active</p>
                                                <p className="text-[10px] text-slate-400 uppercase font-medium">Verified: {new Date().toLocaleTimeString()}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => window.print()}
                                            className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
                                        >
                                            <Printer className="w-4 h-4" /> Export Report
                                        </button>
                                    </div>
                                </div>
                            </BentoCard>
                        </div>
                    ) : (
                        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-12 text-center flex flex-col items-center animate-in zoom-in-95 duration-200">
                            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mb-4">
                                <ShieldAlert className="w-8 h-8 text-rose-500" />
                            </div>
                            <h3 className="text-lg font-bold text-rose-900">Verification Failed</h3>
                            <p className="text-sm text-rose-700 mt-2 max-w-md mx-auto">
                                No matching record was found for this Registration Number. Please ensure the code is correct or contact administration if you suspect fraud.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
