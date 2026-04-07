'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getLicenseStatus } from '@/app/actions/license';
import {
    AlertOctagon,
    ShieldAlert,
    Clock,
    Phone,
    RefreshCcw,
    CheckCircle2
} from 'lucide-react';

export default function LicenseExpiredPage() {
    const router = useRouter();
    const [isChecking, setIsChecking] = useState(false);
    const [statusText, setStatusText] = useState('System Access Suspended');

    const checkSystemAccess = async () => {
        setIsChecking(true);
        setStatusText('Verifying Membership...');
        try {
            const status = await getLicenseStatus();
            if (status) {
                const now = new Date();
                const expiry = new Date(status.expiry_date);
                if (!status.is_revoked && expiry > now) {
                    setStatusText('Access Restored! Redirecting...');
                    // Add a small delay for visual feedback
                    setTimeout(() => {
                        router.push('/front-desk');
                        router.refresh();
                    }, 1500);
                    return true;
                }
            }
        } catch (error) {
            console.error('Failed to check license status:', error);
        }
        setIsChecking(false);
        setStatusText('Still Restricted');
        return false;
    };

    // Auto-poll every 10 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            checkSystemAccess();
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-[40px] shadow-2xl border border-slate-200 p-10 text-center relative overflow-hidden">
                <div className="mb-8 flex justify-center">
                    <div className="p-4 bg-red-50 text-red-600 rounded-[24px] animate-pulse">
                        <AlertOctagon className="w-12 h-12" />
                    </div>
                </div>

                <div className="flex items-center justify-center gap-2 mb-4">
                    <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-100 rounded-full">
                        <div className={`w-1.5 h-1.5 rounded-full ${isChecking ? 'bg-amber-500 animate-bounce' : 'bg-red-500'}`} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{statusText}</span>
                    </div>
                </div>

                <h1 className="text-3xl font-black text-slate-900 tracking-tighter mb-4 leading-tight">
                    Software Access <br /> Restricted
                </h1>

                <p className="text-slate-500 font-medium leading-relaxed mb-8 text-sm">
                    The software license for this PMS system has expired or has been revoked.
                    Access will be restored automatically once the membership is renewed.
                </p>

                <div className="space-y-4">
                    <button
                        onClick={checkSystemAccess}
                        disabled={isChecking}
                        className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-95 disabled:opacity-50"
                    >
                        {isChecking ? (
                            <RefreshCcw className="w-4 h-4 animate-spin" />
                        ) : (
                            <CheckCircle2 className="w-4 h-4" />
                        )}
                        Check System Status
                    </button>

                    <div className="flex items-center gap-4 py-2">
                        <div className="h-px bg-slate-100 flex-1" />
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">or</span>
                        <div className="h-px bg-slate-100 flex-1" />
                    </div>

                    <a
                        href="https://wa.me/917099017799?text=My%20PMS%20Access%20is%20Restricted.%20Please%20help."
                        target="_blank"
                        className="w-full py-5 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"
                    >
                        <Phone className="w-4 h-4" />
                        Contact Support
                    </a>
                </div>

                <div className="mt-10 pt-8 border-t border-slate-100 text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                        System Security Protocol v4.0.1
                    </p>
                </div>
            </div>
        </div>
    );
}
