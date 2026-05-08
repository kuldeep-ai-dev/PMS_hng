'use client';

import { useState, useEffect } from 'react';
import { Cloud, Trash2, ShieldAlert, Loader2, CalendarX, Skull, DatabaseZap, DownloadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { createR2BackupAction, purgeDataByDateRangeAction, factoryResetSystemAction, fetchR2BackupsAction, restoreFromR2BackupAction, deleteR2BackupAction } from '@/app/actions/data-ops';

export function DataOpsClient() {
    const [backups, setBackups] = useState<any[]>([]);
    const [isLoadingBackups, setIsLoadingBackups] = useState(true);
    const [isRestoring, setIsRestoring] = useState(false);

    const [isBackingUp, setIsBackingUp] = useState(false);
    const [isPurging, setIsPurging] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [factoryConfirmText, setFactoryConfirmText] = useState('');

    useEffect(() => {
        const loadBackups = async () => {
            const result = await fetchR2BackupsAction();
            if (result.success) {
                setBackups(result.backups || []);
            }
            setIsLoadingBackups(false);
        };
        loadBackups();
    }, []);

    const handleBackup = async () => {
        setIsBackingUp(true);
        toast.loading('Compiling database snapshot...', { id: 'backup' });

        const result = await createR2BackupAction();

        if (result.success) {
            toast.success(result.message, { id: 'backup' });
            const refresh = await fetchR2BackupsAction();
            if (refresh.success) setBackups(refresh.backups || []);
        } else {
            toast.error(result.error, { id: 'backup' });
        }
        setIsBackingUp(false);
    };

    const handlePurge = async () => {
        if (!startDate || !endDate) {
            toast.error('Please select both start and end dates.');
            return;
        }

        const confirmPurge = confirm(`Are you absolutely sure you want to permanently delete all transactional data between ${startDate} and ${endDate}? This action CANNOT be undone.`);

        if (!confirmPurge) return;

        setIsPurging(true);
        toast.loading('Purging selected data timeframe...', { id: 'purge' });

        // Add artificial delay for loading state effect
        await new Promise(resolve => setTimeout(resolve, 1500));

        const result = await purgeDataByDateRangeAction(new Date(startDate).toISOString(), new Date(endDate).toISOString());

        if (result.success) {
            toast.success(result.message, { id: 'purge' });
            setStartDate('');
            setEndDate('');
        } else {
            toast.error(result.error || 'Failed to purge data', { id: 'purge' });
        }
        setIsPurging(false);
    };

    const handleRestore = async (fileKey: string) => {
        const confirmFirst = confirm(`WARNING: Restoring ${fileKey} will completely WIPE any guest or booking data created after this backup. Proceed?`);
        if (!confirmFirst) return;

        const confirmSecond = prompt(`To authorize full system overwrite, type exactly: RESTORE GHOST DATA`);
        if (confirmSecond !== 'RESTORE GHOST DATA') {
            toast.error('Authorization failed. Restoration aborted.');
            return;
        }

        setIsRestoring(true);
        toast.loading(`Restoring database from ${fileKey}...`, { id: 'restore' });

        const result = await restoreFromR2BackupAction(fileKey);
        if (result.success) {
            toast.success(result.message, { id: 'restore', duration: 10000 });
        } else {
            toast.error(result.error, { id: 'restore', duration: 10000 });
        }
        setIsRestoring(false);
    };

    const handleDeleteBackup = async (fileKey: string) => {
        const confirmDelete = confirm(`Are you sure you want to permanently delete backup ${fileKey.split('/').pop()} from Cloudflare R2?`);
        if (!confirmDelete) return;

        toast.loading('Deleting cloud snapshot...', { id: 'delete-backup' });

        const result = await deleteR2BackupAction(fileKey);
        if (result.success) {
            toast.success(result.message, { id: 'delete-backup' });
            const refresh = await fetchR2BackupsAction();
            if (refresh.success) setBackups(refresh.backups || []);
        } else {
            toast.error(result.error, { id: 'delete-backup' });
        }
    };

    const handleFactoryReset = async () => {
        if (factoryConfirmText !== 'HOTEL NEW GANGA') {
            toast.error('Type "HOTEL NEW GANGA" exactly to confirm this destructive action.');
            return;
        }

        const finalConfirm = confirm('WARNING: THIS WILL DELETE ALL GUESTS, BOOKINGS, PAYMENTS, AND ORDERS IN THE ENTIRE DATABASE. ONLY PROCEED IF YOU ARE SETTING UP A NEW HOTEL. PROCEED?');

        if (!finalConfirm) return;

        setIsResetting(true);
        toast.loading('Executing Database Truncation Protocol...', { id: 'reset' });

        const result = await factoryResetSystemAction();

        if (result.success) {
            toast.success(result.message, { id: 'reset', duration: 10000 });
            setFactoryConfirmText('');
        } else {
            toast.error(result.error || 'Failed to execute factory reset.', { id: 'reset' });
        }
        setIsResetting(false);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8 pb-20">
            {/* Left Column: Backup & Targeted Purge */}
            <div className="space-y-8">
                {/* R2 Backup Panel */}
                <div className="bg-slate-900 rounded-[32px] p-8 border border-slate-800 shadow-2xl relative overflow-hidden group">
                    <Cloud className="absolute -right-8 -top-8 w-40 h-40 text-blue-500/10 group-hover:scale-110 transition-transform duration-700" />
                    <div className="relative z-10 flex items-start gap-5">
                        <div className="p-4 bg-blue-500/20 text-blue-400 rounded-2xl shrink-0">
                            <Cloud className="w-8 h-8" />
                        </div>
                        <div className="flex-1 space-y-4">
                            <div>
                                <h3 className="text-xl font-black text-white tracking-tight">Cloudflare R2 Backup</h3>
                                <p className="text-sm font-medium text-slate-400 mt-1 leading-relaxed">
                                    Generate a structured JSON snapshot of the entire public schema and upload it directly to your remote edge storage bucket.
                                </p>
                            </div>
                            <button
                                onClick={handleBackup}
                                disabled={isBackingUp}
                                className={cn(
                                    "w-full py-4 rounded-xl font-black uppercase text-xs tracking-widest transition-all",
                                    isBackingUp
                                        ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                                        : "bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-900/20 active:scale-[0.98]"
                                )}
                            >
                                {isBackingUp ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" /> Compiling Backup...
                                    </span>
                                ) : "Execute Remote Backup"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Targeted Date Purge */}
                <div className="bg-amber-50 rounded-[32px] p-8 border border-amber-200 shadow-sm relative overflow-hidden group">
                    <CalendarX className="absolute -right-8 -top-8 w-40 h-40 text-amber-500/10 group-hover:rotate-12 transition-transform duration-700" />
                    <div className="relative z-10 flex items-start gap-5">
                        <div className="p-4 bg-amber-100 text-amber-600 rounded-2xl shrink-0">
                            <Trash2 className="w-8 h-8" />
                        </div>
                        <div className="flex-1 space-y-4">
                            <div>
                                <h3 className="text-xl font-black text-amber-900 tracking-tight">Targeted Data Purge</h3>
                                <p className="text-sm font-medium text-amber-700/80 mt-1 leading-relaxed">
                                    Permanently delete all operational records (Bookings, Payments, Orders, Guests) generated within a specific calendar range.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-amber-800/60">Start Range</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full px-4 py-3 bg-white border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 text-sm font-bold text-slate-800"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-amber-800/60">End Range</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        min={startDate}
                                        className="w-full px-4 py-3 bg-white border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 text-sm font-bold text-slate-800"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handlePurge}
                                disabled={isPurging || !startDate || !endDate}
                                className={cn(
                                    "w-full py-4 mt-2 rounded-xl font-black uppercase text-xs tracking-widest transition-all",
                                    isPurging || !startDate || !endDate
                                        ? "bg-amber-200 text-amber-400 cursor-not-allowed"
                                        : "bg-amber-600 hover:bg-amber-700 text-white shadow-xl shadow-amber-900/10 active:scale-[0.98]"
                                )}
                            >
                                {isPurging ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" /> Purging Range...
                                    </span>
                                ) : "Delete Selected Timeframe"}
                            </button>
                        </div>
                    </div>
                </div>
                {/* Cloud Archive Registry */}
                <div className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-slate-100 text-slate-700 rounded-2xl shrink-0">
                            <DatabaseZap className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Cloud Archive Registry</h3>
                            <p className="text-xs font-medium text-slate-500 mt-1">Available R2 snapshots ready for restoration</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {isLoadingBackups ? (
                            <div className="flex items-center justify-center py-8 text-slate-400">
                                <Loader2 className="w-6 h-6 animate-spin" />
                            </div>
                        ) : backups.length === 0 ? (
                            <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-100">
                                <p className="text-sm font-bold text-slate-400">No backups found in R2.</p>
                            </div>
                        ) : (
                            <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar space-y-2">
                                {backups.map((backup, idx) => (
                                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-200 transition-colors">
                                        <div className="min-w-0 pr-4">
                                            <p className="text-sm font-bold text-slate-800 truncate">{backup.filename}</p>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{backup.sizeMB} MB</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{new Date(backup.lastModified).toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleDeleteBackup(backup.key)}
                                                disabled={isRestoring || isBackingUp || isResetting}
                                                className="shrink-0 p-2 bg-white border border-slate-300 hover:border-red-500 hover:text-red-600 text-slate-500 rounded-lg transition-colors disabled:opacity-50"
                                                title="Delete Backup"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleRestore(backup.key)}
                                                disabled={isRestoring || isBackingUp || isResetting}
                                                className="shrink-0 flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:border-indigo-500 hover:text-indigo-600 text-slate-600 rounded-lg text-xs font-black uppercase tracking-widest transition-colors disabled:opacity-50"
                                            >
                                                {isRestoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <DownloadCloud className="w-4 h-4" />}
                                                Re-Roll
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Column: Factory Reset */}
            <div className="bg-red-50 rounded-[32px] p-8 border-2 border-red-200 shadow-sm relative overflow-hidden group flex flex-col">
                <Skull className="absolute -left-12 -bottom-12 w-64 h-64 text-red-500/5 group-hover:scale-125 transition-transform duration-1000" />
                <div className="absolute top-0 right-0 w-full h-2 bg-gradient-to-r from-red-500 via-rose-500 to-orange-500 animate-pulse"></div>

                <div className="relative z-10 flex-1 flex flex-col">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-opacity bg-red-100 text-red-600 rounded-2xl shrink-0 p-4 animate-bounce">
                            <ShieldAlert className="w-10 h-10" />
                        </div>
                        <div>
                            <h3 className="text-3xl font-black text-red-900 tracking-tighter">Factory Reset</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="flex h-2 w-2 rounded-full bg-red-600 animate-pulse"></span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-red-600">Catastrophic Deletion Zone</span>
                            </div>
                        </div>
                    </div>

                    <div className="prose prose-sm prose-red flex-1">
                        <p className="text-red-800 font-medium leading-relaxed">
                            This action is designed exclusively for transitioning the software to a completely new property or executing a baseline wipe after testing.
                        </p>
                        <h4 className="font-bold text-red-900 mt-4 mb-2 uppercase tracking-wide text-xs">What will be destroyed:</h4>
                        <ul className="list-disc pl-5 space-y-1 text-sm text-red-800/80 font-medium">
                            <li>All Registered Guests & PII Data</li>
                            <li>Every Past, Present, and Future Booking</li>
                            <li>All Payments, Receipts, and Folio Charges</li>
                            <li>Restaurant Orders, Table States, and Reservations</li>
                            <li>Housekeeping Logs, Lost & Found, and Room Blocks</li>
                            <li>System Audit Logs, Metrics, and Attendance Records</li>
                        </ul>

                        <h4 className="font-bold text-emerald-900 mt-4 mb-2 uppercase tracking-wide text-xs">What will survive (Config):</h4>
                        <ul className="list-disc pl-5 space-y-1 text-sm text-emerald-800/80 font-medium pb-6 border-b border-red-200">
                            <li>Master & Staff Profiles</li>
                            <li>Room Grid Assets & Properties</li>
                            <li>Restaurant Menu Categories & Items</li>
                            <li>Base Hotel Configuration settings</li>
                        </ul>
                    </div>

                    <div className="mt-6 space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-red-800">
                                Authorization Required: Type <span className="bg-red-200 px-1 py-0.5 rounded text-red-900">HOTEL NEW GANGA</span>
                            </label>
                            <input
                                type="text"
                                value={factoryConfirmText}
                                onChange={(e) => setFactoryConfirmText(e.target.value)}
                                placeholder="I solemnly swear I am up to no good..."
                                className="w-full px-5 py-4 bg-white/50 backdrop-blur border-2 border-red-200 rounded-xl focus:ring-4 focus:ring-red-500/20 focus:border-red-500 text-base font-bold text-red-900 placeholder:text-red-300 placeholder:font-medium transition-all"
                            />
                        </div>

                        <button
                            onClick={handleFactoryReset}
                            disabled={isResetting || factoryConfirmText !== 'HOTEL NEW GANGA'}
                            className={cn(
                                "w-full py-5 rounded-xl font-black uppercase tracking-widest transition-all",
                                isResetting || factoryConfirmText !== 'HOTEL NEW GANGA'
                                    ? "bg-red-200/50 text-red-400 cursor-not-allowed border border-red-200"
                                    : "bg-red-600 hover:bg-red-700 text-white shadow-2xl shadow-red-900/30 active:scale-[0.98] border border-red-500"
                            )}
                        >
                            {isResetting ? (
                                <span className="flex items-center justify-center gap-3">
                                    <Loader2 className="w-5 h-5 animate-spin" /> OBLITERATING DATA...
                                </span>
                            ) : "NUKE SYSTEM"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

