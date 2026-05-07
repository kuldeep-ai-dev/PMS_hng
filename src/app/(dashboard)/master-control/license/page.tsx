'use server';

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import {
    ShieldCheck,
    ShieldAlert,
    Zap,
    Clock,
    History,
    Fingerprint,
    Lock,
    CreditCard
} from 'lucide-react';
import { cn } from '@/lib/utils';
import LicenseManager from '@/components/admin/LicenseManager';
import RenewalRequestMonitor from '@/components/admin/RenewalRequestMonitor';
import { getLicenseStatus } from '@/app/actions/license';

export default async function MasterLicenseAuthorityPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'master') {
        redirect('/front-desk');
    }

    const status = await getLicenseStatus();
    if (!status) return <div>Error loading license.</div>;

    const expiryDate = new Date(status.expiry_date);
    const now = new Date();

    // Normalize for calendar day count
    const d1 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const d2 = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate());

    const diff = expiryDate.getTime() - now.getTime();
    const diffDays = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));

    // Support for granular time display
    const hoursLeft = Math.floor(diff / (1000 * 60 * 60));
    const minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secondsLeft = Math.floor((diff % (1000 * 60)) / 1000);

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 pb-32">
            <header className="flex flex-col gap-2">
                <div className="flex items-center gap-3 mb-2">
                    <span className="px-2 py-0.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded">Authority Level 4</span>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded animate-pulse">
                        <ShieldCheck className="w-3 h-3" />
                        Encrypted Tunnel Active
                    </div>
                </div>
                <h1 className="text-5xl font-black text-slate-900 tracking-tighter">License Authority</h1>
                <p className="text-slate-500 font-medium tracking-tight max-w-2xl text-lg">
                    System-wide membership gating and software validity controls for Geny PMS.
                    Manage client access with cryptographic precision.
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Real-time Status Card */}
                <div className="lg:col-span-1 space-y-8">
                    <div className="bg-white border border-slate-200 rounded-[40px] p-10 relative overflow-hidden shadow-sm group hover:border-slate-300 transition-all h-full">
                        <div className="relative z-10 flex flex-col h-full justify-between gap-12">
                            <div>
                                <div className={cn(
                                    "p-5 rounded-3xl w-fit mb-8 transition-transform group-hover:scale-110",
                                    status.is_revoked ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                                )}>
                                    {status.is_revoked ? <ShieldAlert className="w-10 h-10" /> : <ShieldCheck className="w-10 h-10" />}
                                </div>
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-2">System Access Status</h3>
                                <p className="text-4xl font-black text-slate-900 tracking-tight">
                                    {status.is_revoked ? 'REVOKED' : diff > 0 ? 'AUTHENTIC' : 'EXPIRED'}
                                </p>
                            </div>

                            <div className="space-y-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Granular Countdown</p>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-slate-50 p-4 rounded-2xl text-center border border-slate-100 uppercase tracking-tighter">
                                        <p className="text-2xl font-black text-slate-900">{Math.max(0, hoursLeft)}</p>
                                        <p className="text-[8px] font-black text-slate-400">HRS</p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl text-center border border-slate-100">
                                        <p className="text-2xl font-black text-slate-900">{Math.max(0, minutesLeft)}</p>
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">MIN</p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl text-center border border-slate-100">
                                        <p className="text-2xl font-black text-slate-900 italic animate-pulse">{Math.max(0, secondsLeft)}</p>
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">SEC</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Authority Controls */}
                <div className="lg:col-span-2 space-y-8">
                    <LicenseManager />
                </div>
            </div>

            {/* NEW: Renewal Request Monitor */}
            <div className="bg-white border border-slate-200 rounded-[40px] p-10 shadow-sm relative overflow-hidden">
                <div className="relative z-10">
                    <RenewalRequestMonitor />
                </div>
                <CreditCard className="absolute -bottom-10 -right-10 w-64 h-64 text-slate-50 opacity-10 -rotate-12 pointer-events-none" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-8 border-t border-slate-100">
                <div className="p-8 bg-slate-900 text-white rounded-[40px] flex items-start gap-6 shadow-2xl shadow-slate-200">
                    <div className="p-4 bg-white/10 rounded-3xl">
                        <Fingerprint className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                        <h5 className="text-lg font-black mb-1">Access Protocol</h5>
                        <p className="text-xs text-slate-400 font-medium leading-relaxed">
                            Every license change is cryptographically signed and logged for audit purposes.
                        </p>
                    </div>
                </div>

                <div className="p-8 bg-white border border-slate-200 rounded-[40px] flex items-start gap-6 shadow-sm">
                    <div className="p-4 bg-slate-50 rounded-3xl text-slate-900">
                        <History className="w-6 h-6" />
                    </div>
                    <div>
                        <h5 className="text-lg font-black text-slate-900 mb-1">Audit Trail</h5>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                            Tracking: <strong>{user.email}</strong> updated status at {now.toLocaleTimeString()}.
                        </p>
                    </div>
                </div>

                <div className="p-8 bg-white border border-slate-200 rounded-[40px] flex items-start gap-6 shadow-sm">
                    <div className="p-4 bg-amber-50 rounded-3xl text-amber-600">
                        <Lock className="w-6 h-6" />
                    </div>
                    <div>
                        <h5 className="text-lg font-black text-slate-900 mb-1">Safety Lock</h5>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                            System revocation is immediate and causes global redirection to the lockout screen.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
