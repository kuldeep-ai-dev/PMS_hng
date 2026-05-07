'use client';

import { useState, useEffect } from 'react';
import { 
    Database, Download, Trash2, RotateCcw, ShieldAlert, 
    Calendar, CheckCircle2, AlertTriangle, Loader2, 
    HardDrive, Archive, ArrowRight, History, Zap, Search
} from 'lucide-react';
import { BentoCard } from '@/components/ui/BentoCard';
import { cn } from '@/lib/utils';
import { 
    backupDatabaseAction, 
    listBackupsAction, 
    deleteDateRangeAction, 
    resetSystemAction,
    restoreBackupAction
} from '@/app/actions/master-ops';
import { toast } from 'sonner';

export default function MasterDatabasePage() {
    const [backups, setBackups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Filter/Action states
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [resetPhrase, setResetPhrase] = useState('');

    useEffect(() => {
        loadBackups();
    }, []);

    async function loadBackups() {
        setLoading(true);
        const res = await listBackupsAction();
        if (res.success) setBackups(res.backups || []);
        setLoading(false);
    }

    const handleBackup = async () => {
        setActionLoading('backup');
        try {
            const res = await backupDatabaseAction();
            toast.success(`Backup complete: ${res.fileName}`);
            await loadBackups();
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteRange = async () => {
        if (!startDate || !endDate) return toast.error('Select a date range');
        if (!confirm(`CAUTION: This will permanently erase ALL transactional records between ${startDate} and ${endDate}. Proceed?`)) return;

        setActionLoading('wipe');
        try {
            await deleteDateRangeAction(startDate, endDate);
            toast.success('Data wiped successfully');
            setStartDate('');
            setEndDate('');
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const handleRestore = async (key: string) => {
        if (!confirm('CRITICAL WARNING: This will ERASE all current data and replace it with the backup content. This cannot be undone. Restoring now?')) return;
        
        setActionLoading('restore');
        try {
            await restoreBackupAction(key);
            toast.success('Database restored successfully');
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const handleFullReset = async () => {
        if (resetPhrase !== 'CONFIRM RESET') return toast.error('Invalid confirmation phrase');
        if (!confirm('FINAL WARNING: This will format the entire system for a NEW hotel. All guests, bookings, and payments will be GONE. Ready?')) return;

        setActionLoading('reset');
        try {
            await resetSystemAction();
            toast.success('System formatted successfully');
            setResetPhrase('');
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="space-y-8 pb-20 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="bg-slate-900 p-1.5 rounded-lg shadow-lg">
                            <ShieldAlert className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-slate-500 font-black text-xs uppercase tracking-[0.2em]">Master Authority</span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Database Ops</h1>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1">Snapshot, Recovery & Data Sanitization</p>
                </div>

                <button 
                    onClick={handleBackup}
                    disabled={actionLoading === 'backup'}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-50"
                >
                    {actionLoading === 'backup' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Create Full Backup
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Backup History */}
                <div className="lg:col-span-8">
                    <BentoCard className="p-8 border-2">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                                <History className="w-5 h-5 text-blue-600" />
                                Backup Repository
                            </h2>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Stored in Cloudflare R2
                            </div>
                        </div>

                        <div className="space-y-4">
                            {loading ? (
                                Array(3).fill(0).map((_, i) => (
                                    <div key={i} className="h-16 bg-slate-50 rounded-2xl animate-pulse" />
                                ))
                            ) : backups.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-3xl">
                                    <Archive className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No backups found</p>
                                </div>
                            ) : (
                                backups.map((backup) => (
                                    <div key={backup.key} className="group p-4 bg-slate-50 rounded-2xl border-2 border-transparent hover:border-blue-100 hover:bg-white transition-all flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center">
                                                <Database className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-900 tracking-tight">
                                                    {backup.key.split('/').reverse()[1] || 'Snapshot'}
                                                </p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                    {(backup.size / 1024).toFixed(2)} KB • {new Date(backup.lastModified).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleRestore(backup.key)}
                                            disabled={!!actionLoading}
                                            className="px-4 py-2 bg-white border-2 border-slate-100 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all disabled:opacity-50"
                                        >
                                            Restore
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </BentoCard>
                </div>

                {/* Right Actions */}
                <div className="lg:col-span-4 space-y-8">
                    {/* Selective Wipe */}
                    <BentoCard className="p-8 border-2 border-amber-100">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Trash2 className="w-4 h-4 text-amber-600" />
                            Selective Wipe
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Start Date</label>
                                <input 
                                    type="date" 
                                    className="w-full p-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-bold"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">End Date</label>
                                <input 
                                    type="date" 
                                    className="w-full p-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-bold"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                            <button 
                                onClick={handleDeleteRange}
                                disabled={actionLoading === 'wipe'}
                                className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
                            >
                                {actionLoading === 'wipe' ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Erase Date Range'}
                            </button>
                        </div>
                    </BentoCard>

                    {/* Reset System */}
                    <BentoCard className="p-8 border-2 border-rose-100 bg-rose-50/20">
                        <div className="flex items-center gap-2 mb-4 text-rose-600">
                            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                            <h3 className="text-sm font-black uppercase tracking-widest">System Reset</h3>
                        </div>
                        <p className="text-[10px] font-bold text-rose-800/60 leading-relaxed mb-6 uppercase tracking-tight">
                            Format database for a new client. Wipes all transactional data.
                        </p>
                        
                        <div className="space-y-4">
                            <input 
                                type="text" 
                                placeholder="Type 'CONFIRM RESET'"
                                className="w-full p-3 bg-white border-2 border-rose-100 rounded-xl text-xs font-black uppercase tracking-widest placeholder:text-rose-200"
                                value={resetPhrase}
                                onChange={(e) => setResetPhrase(e.target.value)}
                            />
                            <button 
                                onClick={handleFullReset}
                                disabled={actionLoading === 'reset' || resetPhrase !== 'CONFIRM RESET'}
                                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-rose-500/20 transition-all disabled:opacity-50"
                            >
                                {actionLoading === 'reset' ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Format Entire System'}
                            </button>
                        </div>
                    </BentoCard>
                </div>
            </div>
        </div>
    );
}
