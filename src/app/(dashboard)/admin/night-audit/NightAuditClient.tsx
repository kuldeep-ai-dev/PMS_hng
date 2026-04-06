'use client';

import React, { useEffect, useState } from 'react';
import { BentoCard } from '@/components/ui/BentoCard';
import { getPreflightStatus, executeRollDate } from '../actions-night-audit';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, FileJson, FileText, Calendar, HelpCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { updateSettings } from '../../settings/actions';

export function NightAuditClient({
    date,
    settings,
    isAdmin = false
}: {
    date: string,
    settings?: any,
    isAdmin?: boolean
}) {
    const router = useRouter();
    const [auditDate, setAuditDate] = useState(date);

    const [loading, setLoading] = useState(true);
    const [executing, setExecuting] = useState(false);
    const [showGuideModal, setShowGuideModal] = useState(false);
    const [forceOverride, setForceOverride] = useState(false);

    // Settings state
    const [auditStart, setAuditStart] = useState(settings?.audit_window_start || "23:00");
    const [auditEnd, setAuditEnd] = useState(settings?.audit_window_end || "02:00");
    const [savingSettings, setSavingSettings] = useState(false);

    const [status, setStatus] = useState<{
        unpaidPos: number;
        overstayedGuests: number;
        unsettledCheckouts: number;
        canRoll: boolean;
        errors?: string[];
    } | null>(null);

    const todayStr = new Date().toLocaleDateString('en-CA');
    const isAuditingToday = auditDate === todayStr;

    const loadStatus = async () => {
        setLoading(true);
        try {
            const data = await getPreflightStatus(auditDate);
            setStatus(data);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStatus();
    }, [auditDate]);

    const handleRollDate = async () => {
        if (!status?.canRoll && !forceOverride) return;

        if (!confirm(`Are you sure you want to execute Night Audit for ${auditDate}? This is an atomic operation.`)) {
            return;
        }

        setExecuting(true);
        try {
            const result = await executeRollDate(auditDate);
            toast.success('Night Audit executed successfully!');
            router.refresh();
        } catch (error: any) {
            toast.error('Failed to Roll Date: ' + (error.message || 'Atomic transaction reversed'));
        } finally {
            setExecuting(false);
        }
    };

    const handleSaveSettings = async () => {
        if (!isAdmin) return;
        setSavingSettings(true);
        try {
            await updateSettings({
                ...settings,
                audit_window_start: auditStart,
                audit_window_end: auditEnd
            });
            toast.success('System Lockdown Timers updated successfully!');
            router.refresh();
        } catch (error: any) {
            toast.error('Failed to update Settings: ' + error.message);
        } finally {
            setSavingSettings(false);
        }
    };

    const StatusItem = ({ label, value, isError }: { label: string, value: number, isError: boolean }) => (
        <div className={`p-4 rounded-xl border flex items-center justify-between ${isError ? 'bg-red-50/50 border-red-100' : 'bg-emerald-50/50 border-emerald-100'}`}>
            <div className="flex items-center gap-3">
                {isError ? <XCircle className="w-5 h-5 text-red-500" /> : <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                <span className="font-medium text-slate-700">{label}</span>
            </div>
            <div className={`text-lg font-bold ${isError ? 'text-red-600' : 'text-emerald-600'}`}>
                {value} {value === 1 ? 'Issue' : 'Issues'}
            </div>
        </div>
    );

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Left Column: Preflight Check */}
                <div className="md:col-span-8 flex flex-col gap-6">
                    <BentoCard className="p-6 flex flex-col h-full bg-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                            <AlertCircle className="w-32 h-32" />
                        </div>

                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div>
                                    <h2 className="text-xl font-bold tracking-tight text-slate-800">Pre-Flight Checklist</h2>
                                    <p className="text-sm text-slate-500">Validation layer to scan for dirty data</p>
                                </div>
                                <button
                                    onClick={() => setShowGuideModal(true)}
                                    className="ml-2 flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                                >
                                    <HelpCircle className="w-4 h-4" />
                                    Guide
                                </button>
                            </div>
                            <button
                                onClick={loadStatus}
                                disabled={loading}
                                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition disabled:opacity-50"
                            >
                                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        {loading || !status ? (
                            <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-400">
                                <RefreshCw className="w-8 h-8 animate-spin mb-4" />
                                <p>Scanning datasets...</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                <StatusItem label="Unposted POS Charges" value={status.unpaidPos} isError={status.unpaidPos > 0} />
                                <StatusItem label="Guests active past checkout" value={status.overstayedGuests} isError={status.overstayedGuests > 0} />
                                <StatusItem label="Open Folios with zeroed payments" value={status.unsettledCheckouts} isError={status.unsettledCheckouts > 0} />

                                {status.errors && status.errors.length > 0 && (
                                    <div className="mt-2 p-3 bg-red-100 text-red-700 rounded text-sm">
                                        {status.errors.join(", ")}
                                    </div>
                                )}
                            </div>
                        )}
                    </BentoCard>
                </div>

                {/* Right Column: Execute & Reports */}
                <div className="md:col-span-4 flex flex-col gap-6">
                    <BentoCard className="p-6 flex flex-col bg-slate-900 border-none shadow-2xl relative overflow-hidden">
                        <div className="z-10 flex flex-col items-center text-center space-y-4">
                            <Calendar className="w-12 h-12 text-blue-400" />
                            <h2 className="text-2xl font-bold text-white tracking-tight">Roll Date</h2>
                            <p className="text-blue-200/60 text-sm pb-4">Point of No Return. Atomic execution of global Room & Tax posting.</p>

                            <div className="w-full text-left space-y-2 pb-4">
                                <label className="text-xs font-semibold text-blue-300 uppercase tracking-wider">Business Date</label>
                                <input
                                    type="date"
                                    value={auditDate}
                                    onChange={(e) => setAuditDate(e.target.value)}
                                    className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            {isAuditingToday && (
                                <div className="w-full text-left bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg flex items-start gap-3 mb-2 animate-in slide-in-from-top-2">
                                    <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                                    <p className="text-[10px] text-amber-200 leading-tight">
                                        <strong className="block text-amber-400 mb-0.5 text-xs">Auditing Current Date</strong>
                                        You are auditing today ({auditDate}). Usually, Day Closing is performed for <strong>yesterday</strong> during the night or early morning. Auditing today will flag all checkouts as overstays until they are formally checked out.
                                    </p>
                                </div>
                            )}

                            {isAdmin && !status?.canRoll && !loading && status && (
                                <div className="w-full text-left bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex items-start gap-3 mb-2 animate-in fade-in">
                                    <input
                                        type="checkbox"
                                        id="force"
                                        checked={forceOverride}
                                        onChange={(e) => setForceOverride(e.target.checked)}
                                        className="mt-1 w-4 h-4 rounded border-red-500/30 text-red-600 focus:ring-red-500 bg-slate-900"
                                    />
                                    <label htmlFor="force" className="text-xs text-red-200 cursor-pointer">
                                        <strong className="block text-red-400">Admin Override</strong>
                                        Acknowledge warnings and force execute the Roll Date anyway.
                                    </label>
                                </div>
                            )}

                            <button
                                disabled={(!status?.canRoll && !forceOverride) || executing}
                                onClick={handleRollDate}
                                className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${(!status?.canRoll && !forceOverride)
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:shadow-lg hover:shadow-blue-500/25 active:scale-95'
                                    }`}
                            >
                                {executing ? 'Executing...' : 'EXECUTE ROLL DATE'}
                            </button>
                        </div>
                        {/* Background blob */}
                        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
                    </BentoCard>

                    <BentoCard className="p-6 bg-white">
                        <h2 className="text-lg font-bold tracking-tight text-slate-800 mb-4">Manager's Flash Report</h2>
                        <div className="flex gap-4">
                            <a
                                href={`/api/night-audit/report?date=${auditDate}&format=json`}
                                target="_blank"
                                className="flex-1 flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition group"
                            >
                                <FileJson className="w-6 h-6 text-slate-400 group-hover:text-blue-500 mb-2" />
                                <span className="text-sm font-medium text-slate-600 group-hover:text-blue-600">JSON</span>
                            </a>
                            <a
                                href={`/api/night-audit/report?date=${auditDate}&format=pdf`}
                                target="_blank"
                                className="flex-1 flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 hover:border-red-500 hover:bg-red-50 transition group"
                            >
                                <FileText className="w-6 h-6 text-slate-400 group-hover:text-red-500 mb-2" />
                                <span className="text-sm font-medium text-slate-600 group-hover:text-red-600">PDF</span>
                            </a>
                        </div>
                    </BentoCard>

                    {isAdmin && (
                        <BentoCard className="p-6 bg-slate-50 border border-slate-200">
                            <h2 className="text-lg font-bold tracking-tight text-slate-800 mb-2">Automated Lockdown Window</h2>
                            <p className="text-xs text-slate-500 mb-4">Front Office must complete this audit within this timeframe to avoid system lockout.</p>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Expected Start</label>
                                    <input
                                        type="time"
                                        value={auditStart}
                                        onChange={e => setAuditStart(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-rose-500 uppercase tracking-wider mb-1 block">Hard Lock Drop-dead</label>
                                    <input
                                        type="time"
                                        value={auditEnd}
                                        onChange={e => setAuditEnd(e.target.value)}
                                        className="w-full bg-red-50 border border-red-200 text-red-700 rounded-lg p-2 focus:ring-2 focus:ring-red-500 outline-none text-sm font-bold"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleSaveSettings}
                                disabled={savingSettings || (auditStart === settings?.audit_window_start && auditEnd === settings?.audit_window_end)}
                                className="w-full py-2.5 rounded-lg bg-slate-800 text-white font-medium text-sm hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {savingSettings ? 'Saving...' : 'Update Protocol Timers'}
                            </button>
                        </BentoCard>
                    )}
                </div>
            </div>

            {/* Guide Modal Overlay */}
            {
                showGuideModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                        <HelpCircle className="w-5 h-5" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800">Pre-Flight Warning Guide</h3>
                                </div>
                                <button
                                    onClick={() => setShowGuideModal(false)}
                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-amber-500" />
                                        Unposted POS Charges
                                    </h4>
                                    <p className="text-sm text-slate-600 leading-relaxed bg-amber-50/50 p-3 rounded-lg border border-amber-100">
                                        <strong>What it means:</strong> Active POS orders marked as "charged_to_room" that are still 'unpaid'.
                                        <br /><br />
                                        <strong>🔧 How to solve:</strong> Settle the outstanding POS orders or navigate to the Folio to post them to the Guest Ledger so they log as revenue.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-amber-500" />
                                        Guests active past checkout
                                    </h4>
                                    <p className="text-sm text-slate-600 leading-relaxed bg-amber-50/50 p-3 rounded-lg border border-amber-100">
                                        <strong>What it means:</strong> Guests whose check-out date is earlier than today, but their status is still 'In-House/Active'.
                                        <br /><br />
                                        <strong>🔧 How to solve:</strong> Formally check them out of the system, or extend their stay by adjusting their check-out date to bill them properly for tonight.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-amber-500" />
                                        Open Folios with zeroed payments
                                    </h4>
                                    <p className="text-sm text-slate-600 leading-relaxed bg-amber-50/50 p-3 rounded-lg border border-amber-100">
                                        <strong>What it means:</strong> Checkouts from today whose folios have not been marked as 'Settled' (e.g., unaccounted balances).
                                        <br /><br />
                                        <strong>🔧 How to solve:</strong> Go to the Front Desk or Money Receipts module to ensure checkout payments match the total bill and mark the folios as settled. (Corporate City Ledger bypasses this).
                                    </p>
                                </div>
                            </div>

                            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                                <button
                                    onClick={() => setShowGuideModal(false)}
                                    className="px-6 py-2 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition"
                                >
                                    Understood
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
}
