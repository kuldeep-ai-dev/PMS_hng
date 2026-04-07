'use client';

import { useState, useEffect } from 'react';
import { getLicenseStatus, updateLicenseStatus, LicenseStatus } from '@/app/actions/license';
import {
    ShieldCheck,
    ShieldAlert,
    Calendar,
    Clock,
    RefreshCcw,
    Save,
    AlertTriangle,
    Zap,
    Lock,
    IndianRupee
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function LicenseManager() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<LicenseStatus | null>(null);

    // Form states
    const [expiryDate, setExpiryDate] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [isTrial, setIsTrial] = useState(false);
    const [isRevoked, setIsRevoked] = useState(false);

    useEffect(() => {
        loadStatus();
    }, []);

    const loadStatus = async () => {
        setLoading(true);
        const data = await getLicenseStatus();
        if (data) {
            setStatus(data);
            setIsActive(data.is_active);
            setIsTrial(data.is_trial);
            setIsRevoked(data.is_revoked);

            // Format for datetime-local input (YYYY-MM-DDTHH:mm)
            const d = new Date(data.expiry_date);
            const formatted = d.toISOString().slice(0, 16);
            setExpiryDate(formatted);
        }
        setLoading(false);
    };

    const handleSave = async () => {
        setSaving(true);
        const res = await updateLicenseStatus({
            is_active: isActive,
            is_trial: isTrial,
            is_revoked: isRevoked,
            expiry_date: new Date(expiryDate).toISOString(),
            renewal_amount: status?.renewal_amount
        });

        if (res.success) {
            toast.success('License settings updated globally');
            loadStatus();
        } else {
            toast.error(res.error || 'Failed to update license');
        }
        setSaving(false);
    };

    const addTime = (amount: number, unit: 'hours' | 'days') => {
        const current = new Date(); // Start from present date per user request
        if (unit === 'hours') {
            current.setHours(current.getHours() + amount);
        } else {
            current.setDate(current.getDate() + amount);
        }
        setExpiryDate(current.toISOString().slice(0, 16));
        toast.info(`Expiry set to ${current.toLocaleString()} (Added from now)`);
    };

    if (loading) {
        return (
            <div className="bg-white border border-slate-200 rounded-[40px] p-8 shadow-sm animate-pulse">
                <div className="h-4 w-32 bg-slate-100 rounded-full mb-4"></div>
                <div className="space-y-4">
                    <div className="h-12 w-full bg-slate-50 rounded-2xl"></div>
                    <div className="h-12 w-full bg-slate-50 rounded-2xl"></div>
                </div>
            </div>
        );
    }

    const isExpired = status ? new Date(status.expiry_date) < new Date() : false;

    return (
        <div className="bg-white border border-slate-200 rounded-[40px] p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "p-3 rounded-2xl",
                        isRevoked ? "bg-red-50 text-red-600" :
                            isExpired ? "bg-amber-50 text-amber-600" :
                                "bg-emerald-50 text-emerald-600"
                    )}>
                        {isRevoked ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-10 h-10" />}
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">License Authority</h2>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Global Validity Control</p>
                    </div>
                </div>
                <button
                    onClick={loadStatus}
                    className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400"
                >
                    <RefreshCcw className="w-4 h-4" />
                </button>
            </div>

            <div className="space-y-6">
                {/* Expiry Date Picker */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Membership Valid Until</label>
                    <div className="relative group">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
                        <input
                            type="datetime-local"
                            value={expiryDate}
                            onChange={(e) => setExpiryDate(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-slate-900 transition-all outline-none"
                        />
                    </div>
                </div>

                {/* Toggles Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => setIsTrial(!isTrial)}
                        className={cn(
                            "p-4 rounded-2xl border transition-all flex items-center justify-between group text-left",
                            isTrial ? "bg-indigo-50 border-indigo-100 text-indigo-700" : "bg-slate-50 border-slate-100 text-slate-400"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <Zap className={cn("w-4 h-4", isTrial ? "text-indigo-500" : "text-slate-300")} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Trial Mode</span>
                        </div>
                        <div className={cn(
                            "w-8 h-4 rounded-full relative transition-colors shrink-0",
                            isTrial ? "bg-indigo-500" : "bg-slate-200"
                        )}>
                            <div className={cn(
                                "absolute top-1 w-2 h-2 rounded-full bg-white transition-all",
                                isTrial ? "right-1" : "left-1"
                            )} />
                        </div>
                    </button>

                    <button
                        onClick={() => setIsRevoked(!isRevoked)}
                        className={cn(
                            "p-4 rounded-2xl border transition-all flex items-center justify-between group text-left",
                            isRevoked ? "bg-red-50 border-red-100 text-red-700" : "bg-slate-50 border-slate-100 text-slate-400"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <Lock className={cn("w-4 h-4", isRevoked ? "text-red-500" : "text-slate-300")} />
                            <span className="text-[10px] font-black uppercase tracking-widest leading-tight">Revoke<br />Access</span>
                        </div>
                        <div className={cn(
                            "w-8 h-4 rounded-full relative transition-colors shrink-0",
                            isRevoked ? "bg-red-500" : "bg-slate-200"
                        )}>
                            <div className={cn(
                                "absolute top-1 w-2 h-2 rounded-full bg-white transition-all",
                                isRevoked ? "right-1" : "left-1"
                            )} />
                        </div>
                    </button>
                </div>

                {/* Global Renewal Amount (Master Only) */}
                <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Global Renewal Amount (INR)</label>
                    <div className="relative group">
                        <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
                        <input
                            type="number"
                            value={status?.renewal_amount || 14999}
                            onChange={(e) => setStatus(prev => prev ? { ...prev, renewal_amount: parseFloat(e.target.value) } : null)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-slate-900 transition-all outline-none"
                        />
                    </div>
                </div>

                {/* Quick Extend Controls */}
                <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Quick Extend Trial / Validity</p>
                    <div className="grid grid-cols-4 gap-2">
                        <button
                            onClick={() => addTime(1, 'hours')}
                            className="py-3 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl text-[10px] font-black text-slate-600 transition-all active:scale-95"
                        >
                            +1 HR
                        </button>
                        <button
                            onClick={() => addTime(6, 'hours')}
                            className="py-3 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl text-[10px] font-black text-slate-600 transition-all active:scale-95"
                        >
                            +6 HRS
                        </button>
                        <button
                            onClick={() => addTime(1, 'days')}
                            className="py-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-xl text-[10px] font-black text-indigo-600 transition-all active:scale-95"
                        >
                            +1 DAY
                        </button>
                        <button
                            onClick={() => addTime(7, 'days')}
                            className="py-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 rounded-xl text-[10px] font-black text-emerald-600 transition-all active:scale-95"
                        >
                            +7 DAYS
                        </button>
                    </div>
                </div>

                {/* Global Enforcement Alert */}
                {(isRevoked || isExpired) && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                        <p className="text-[10px] font-bold text-red-700 leading-relaxed uppercase tracking-tight">
                            System Lockout Active: Residents/Admins currently redirected to expiry page.
                        </p>
                    </div>
                )}

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full py-5 bg-slate-900 hover:bg-slate-800 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-200 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
                >
                    {saving ? (
                        <>
                            <RefreshCcw className="w-4 h-4 animate-spin" />
                            Updating Authority...
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4" />
                            Commit License Changes
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
