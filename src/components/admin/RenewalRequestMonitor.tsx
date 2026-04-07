'use client';

import { useState, useEffect } from 'react';
import { getRenewalRequests, updateRenewalRequestStatus, RenewalRequest } from '@/app/actions/license';
import {
    Check,
    X,
    Clock,
    AlertCircle,
    MessageSquare,
    IndianRupee,
    CreditCard,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function RenewalRequestMonitor() {
    const [requests, setRequests] = useState<RenewalRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [denyingId, setDenyingId] = useState<string | null>(null);
    const [denialMessage, setDenialMessage] = useState('');

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {
        setLoading(true);
        const data = await getRenewalRequests();
        setRequests(data);
        setLoading(false);
    };

    const handleAction = async (id: string, status: 'accepted' | 'denied') => {
        if (status === 'denied' && !denialMessage) {
            setDenyingId(id);
            return;
        }

        const res = await updateRenewalRequestStatus(id, status, status === 'denied' ? denialMessage : undefined);
        if (res.success) {
            toast.success(`Request ${status} successfully`);
            setDenyingId(null);
            setDenialMessage('');
            loadRequests();
        } else {
            toast.error(res.error || 'Operation failed');
        }
    };

    if (loading) return <div className="p-12 text-center animate-pulse text-slate-400 font-black uppercase text-[10px] tracking-widest">Scanning Requests...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Active Renewal Requests</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Review and authorize license extensions</p>
                </div>
                <div className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        {requests.filter(r => r.status === 'pending').length} Pending
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {requests.length === 0 ? (
                    <div className="p-20 text-center border-2 border-dashed border-slate-100 rounded-[40px]">
                        <AlertCircle className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                        <p className="text-xs font-black uppercase tracking-widest text-slate-300">No requests in queue</p>
                    </div>
                ) : (
                    requests.map((req) => (
                        <div key={req.id} className={cn(
                            "group bg-white border rounded-[32px] p-8 shadow-sm hover:shadow-md transition-all",
                            req.status === 'pending' ? "border-amber-100 bg-amber-50/10" : "border-slate-100"
                        )}>
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                                <div className="flex items-start gap-6">
                                    <div className={cn(
                                        "p-4 rounded-2xl",
                                        req.status === 'accepted' ? "bg-emerald-50 text-emerald-600" :
                                            req.status === 'denied' ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                                    )}>
                                        <CreditCard className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <h4 className="text-xl font-black text-slate-900">INR {req.amount.toLocaleString()}</h4>
                                            <span className="px-2 py-0.5 bg-slate-900 text-white text-[9px] font-black rounded-lg uppercase tracking-widest">
                                                {req.payment_mode}
                                            </span>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight">
                                                TxID: <span className="text-slate-600 select-all font-bold">{req.transaction_id}</span>
                                            </p>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight">
                                                Submitted: <span className="text-slate-600">{new Date(req.created_at).toLocaleString()}</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-3">
                                    {req.status === 'pending' ? (
                                        <>
                                            {denyingId === req.id ? (
                                                <div className="flex items-center gap-2 animate-in slide-in-from-right-4 duration-300">
                                                    <input
                                                        type="text"
                                                        placeholder="Denial reason..."
                                                        value={denialMessage}
                                                        onChange={(e) => setDenialMessage(e.target.value)}
                                                        className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold w-64 outline-none focus:ring-2 focus:ring-red-500"
                                                    />
                                                    <button
                                                        onClick={() => handleAction(req.id, 'denied')}
                                                        className="p-3 bg-red-600 text-white rounded-xl hover:bg-red-700 shadow-lg shadow-red-100"
                                                    >
                                                        <X className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => setDenyingId(null)}
                                                        className="p-3 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200"
                                                    >
                                                        <MessageSquare className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => handleAction(req.id, 'accepted')}
                                                        className="px-6 py-3 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-50 flex items-center gap-2 transition-all active:scale-95"
                                                    >
                                                        <Check className="w-4 h-4" /> Approve
                                                    </button>
                                                    <button
                                                        onClick={() => setDenyingId(req.id)}
                                                        className="px-6 py-3 bg-white border border-red-100 text-red-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-50 flex items-center gap-2 transition-all active:scale-95"
                                                    >
                                                        <X className="w-4 h-4" /> Reject
                                                    </button>
                                                </>
                                            )}
                                        </>
                                    ) : (
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2",
                                                req.status === 'accepted' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                                            )}>
                                                {req.status === 'accepted' ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                                {req.status}
                                            </div>
                                            {req.status === 'denied' && req.denial_message && (
                                                <p className="text-[10px] font-bold text-red-400 italic">"{req.denial_message}"</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
