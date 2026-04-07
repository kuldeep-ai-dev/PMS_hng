'use client';

import { useState, useEffect } from 'react';
import { getLicenseStatus, getClientRenewalRequests, RenewalRequest } from '@/app/actions/license';
import {
    ShieldCheck,
    ShieldAlert,
    Calendar,
    CreditCard,
    Zap,
    Clock,
    FileText,
    HelpCircle,
    ChevronRight,
    History as LucideHistory,
    AlertCircle,
    CheckCircle2,
    Timer,
    RefreshCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import RenewalRequestForm from '@/components/admin/RenewalRequestForm';

export default function AdminLicensePage() {
    const [status, setStatus] = useState<any>(null);
    const [requests, setRequests] = useState<RenewalRequest[]>([]);
    const [showRenewalModal, setShowRenewalModal] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const [licenseData, reqData] = await Promise.all([
            getLicenseStatus(),
            getClientRenewalRequests()
        ]);
        setStatus(licenseData);
        setRequests(reqData);
        setLoading(false);
    };

    if (loading) return <div className="p-8 animate-pulse text-slate-400 font-black uppercase text-[10px] tracking-widest text-center">Decrypting Status...</div>;
    if (!status) return <div>Error loading license.</div>;

    const expiryDate = new Date(status.expiry_date);
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8 pb-32">
            <header className="flex flex-col gap-2">
                <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Software License</h1>
                <p className="text-slate-500 font-medium tracking-tight">View your membership validity and system status.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Validity Card */}
                <div className="md:col-span-2 bg-white border border-slate-200 rounded-[40px] p-10 relative overflow-hidden group shadow-sm">
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "p-4 rounded-3xl",
                                    diffDays > 30 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                                )}>
                                    <ShieldCheck className="w-8 h-8" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Status</p>
                                    <h3 className="text-2xl font-black text-slate-900">
                                        {status.is_revoked ? 'Revoked' : diffDays > 0 ? 'Active Membership' : 'Expired'}
                                    </h3>
                                </div>
                            </div>
                            {/* System Health Badge */}
                            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-full">
                                <div className={cn("w-2 h-2 rounded-full", diffDays > 0 ? "bg-emerald-500 animate-pulse" : "bg-red-500")} />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">System Health: {diffDays > 0 ? 'Optimal' : 'Halted'}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-100">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Valid Until</p>
                                <div className="flex items-center gap-3">
                                    <Calendar className="w-5 h-5 text-slate-400" />
                                    <span className="text-xl font-bold text-slate-900">
                                        {expiryDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Time Remaining</p>
                                <div className="flex items-center gap-3">
                                    <Clock className="w-5 h-5 text-slate-400" />
                                    <span className={cn(
                                        "text-xl font-bold",
                                        diffDays > 30 ? "text-slate-900" : "text-red-600"
                                    )}>
                                        {diffDays > 0 ? `${diffDays} Days Left` : '0 Days'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Decorative glow */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-50 group-hover:opacity-80 transition-opacity" />
                </div>

                {/* Account Type Card */}
                <div className="bg-slate-900 rounded-[40px] p-10 text-white flex flex-col justify-between shadow-2xl shadow-slate-200">
                    <div>
                        <div className="p-3 bg-white/10 rounded-2xl w-fit mb-6">
                            {status.is_trial ? <Zap className="w-6 h-6 text-amber-400" /> : <CreditCard className="w-6 h-6" />}
                        </div>
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Plan Details</h4>
                        <p className="text-3xl font-black">{status.is_trial ? 'Trial Access' : 'Business Suite'}</p>
                    </div>

                    <div className="pt-8 space-y-4">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                            <span>Update Priority</span>
                            <span className="text-white">Enterprise</span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                            <span>API Access</span>
                            <span className="text-emerald-400">Unlimited</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Request Tracker & Renewal CTA */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Status Tracker */}
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[40px] p-10 shadow-sm">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-3 bg-slate-50 text-slate-900 rounded-2xl">
                            <Timer className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Recent Renewal Activity</h3>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Track your payment approvals</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {requests.length === 0 ? (
                            <div className="p-12 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                                <p className="text-xs font-black uppercase tracking-widest text-slate-300">No active requests found</p>
                            </div>
                        ) : (
                            requests.map((req) => (
                                <div key={req.id} className="p-6 bg-slate-50 border border-slate-100 rounded-3xl flex items-center justify-between group hover:border-slate-200 transition-all">
                                    <div className="flex items-center gap-6">
                                        <div className={cn(
                                            "p-4 rounded-2xl",
                                            req.status === 'accepted' ? "bg-emerald-100 text-emerald-600" :
                                                req.status === 'denied' ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600 animate-pulse"
                                        )}>
                                            {req.status === 'accepted' ? <CheckCircle2 className="w-6 h-6" /> :
                                                req.status === 'denied' ? <AlertCircle className="w-6 h-6" /> : <RefreshCcw className="w-6 h-6" />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-black uppercase tracking-widest text-slate-900">INR {req.amount.toLocaleString()}</span>
                                                <span className="text-[9px] font-black px-1.5 py-0.5 bg-white border border-slate-100 rounded-lg text-slate-400">{req.payment_mode}</span>
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Ref: {req.transaction_id.slice(0, 15)}...</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={cn(
                                            "text-[10px] font-black uppercase tracking-widest mb-1",
                                            req.status === 'accepted' ? "text-emerald-600" :
                                                req.status === 'denied' ? "text-red-600" : "text-amber-600"
                                        )}>
                                            {req.status}
                                        </p>
                                        <p className="text-[9px] font-bold text-slate-300">{new Date(req.created_at).toLocaleDateString()}</p>
                                        {req.status === 'denied' && req.denial_message && (
                                            <div className="mt-4 p-3 bg-red-50 text-red-700 text-[9px] font-bold rounded-xl border border-red-100 text-left">
                                                Reason: {req.denial_message}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Renewal CTA */}
                <div className="bg-indigo-600 rounded-[40px] p-10 text-white flex flex-col justify-between shadow-xl shadow-indigo-100 relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="p-4 bg-white/10 rounded-[24px] w-fit mb-8">
                            <CreditCard className="w-8 h-8" />
                        </div>
                        <h5 className="text-2xl font-black mb-4 tracking-tight">Need a Renewal?</h5>
                        <p className="text-indigo-100 text-sm font-medium mb-12 leading-relaxed opacity-80">
                            Secure your property operations for another year with our premium business suite.
                        </p>
                    </div>

                    <div className="space-y-4 relative z-10">
                        <button
                            onClick={async () => {
                                await loadData(); // Get fresh pricing before opening
                                setShowRenewalModal(true);
                            }}
                            className="w-full py-5 bg-white text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xl shadow-indigo-900/20"
                        >
                            Request Full Renewal
                        </button>
                        <p className="text-[9px] text-center font-bold text-indigo-200 uppercase tracking-widest opacity-60">
                            Instant Request Integration
                        </p>
                    </div>

                    {/* Decorative bubble */}
                    <div className="absolute bottom-0 right-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 translate-x-1/2 blur-2xl" />
                </div>
            </div>

            {/* Feature Rich Content: Active Capabilities */}
            <div className="space-y-6 pt-8 border-t border-slate-100">
                <h2 className="text-xl font-black text-slate-900 tracking-tight ml-2">Active Software Capabilities</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Booking Hub', icon: Calendar, active: true },
                        { label: 'Restaurant POS', icon: Zap, active: true },
                        { label: 'Revenue Analytics', icon: Zap, active: true },
                        { label: 'Staff Portal', icon: ShieldCheck, active: true },
                        { label: 'Inventory Core', icon: CreditCard, active: true },
                        { label: 'WhatsApp API', icon: ShieldCheck, active: true },
                        { label: 'Audit Logs', icon: LucideHistory, active: true },
                        { label: 'Security RBAC', icon: ShieldCheck, active: true },
                    ].map((feature, i) => (
                        <div key={i} className="p-6 bg-white border border-slate-100 rounded-3xl flex items-center gap-4 group hover:border-slate-300 transition-all shadow-sm">
                            <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl group-hover:bg-slate-900 group-hover:text-white transition-all">
                                <feature.icon className="w-4 h-4" />
                            </div>
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-600">{feature.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="p-8 bg-white border border-slate-200 rounded-[40px] flex items-start gap-6 shadow-sm">
                <div className="p-4 bg-slate-50 text-slate-900 rounded-3xl">
                    <FileText className="w-6 h-6" />
                </div>
                <div>
                    <h5 className="text-lg font-black text-slate-900 mb-2">Membership Agreement</h5>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed mb-4 max-w-2xl">
                        Your usage of the PMS is governed by our enterprise licensing agreement. For renewals or plan upgrades, please contact your account manager directly via our secure channel.
                    </p>
                    <a href="tel:+917099017799" className="text-xs font-black text-indigo-600 uppercase tracking-widest hover:underline flex items-center gap-2">
                        Contact Support <ChevronRight className="w-3 h-3" />
                    </a>
                </div>
            </div>

            {/* Modal */}
            {showRenewalModal && (
                <RenewalRequestForm
                    renewalAmount={status.renewal_amount || 14999}
                    onClose={() => {
                        setShowRenewalModal(false);
                        loadData();
                    }}
                />
            )}
        </div>
    );
}
