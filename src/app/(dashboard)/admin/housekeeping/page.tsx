import { getHousekeepingLogs, updateCleaningStatus } from '@/app/actions/housekeeping';
import { BentoCard } from '@/components/ui/BentoCard';
import { BedDouble, Clock, User, CheckCircle2, Timer, History, PlayCircle, CheckCircle } from 'lucide-react';
import { formatDistanceToNow, formatDistance } from 'date-fns';
import { cn } from '@/lib/utils';
import StatusButtons from './StatusButtons';

export default async function HousekeepingLogPage() {
    const logs = await getHousekeepingLogs();

    const getStatusStyle = (status: string) => {
        const s = status?.toLowerCase();
        switch (s) {
            case 'completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-200 animate-pulse';
            case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const calculateDuration = (start: string | null, end: string | null) => {
        if (!start || !end) return 'N/A';
        try {
            return formatDistance(new Date(start), new Date(end));
        } catch (e) {
            return 'N/A';
        }
    };

    return (
        <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <History className="w-8 h-8 text-amber-600" /> Housekeeping Monitor
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">Track cleaning assignments and performance metrics</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <BentoCard className="p-6 bg-amber-50 border-amber-100">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white rounded-2xl shadow-sm text-amber-600">
                            <Clock className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-amber-700/60 uppercase tracking-widest">Pending Tasks</p>
                            <p className="text-2xl font-black text-amber-900">{logs.filter(l => l.status?.toLowerCase() === 'pending').length}</p>
                        </div>
                    </div>
                </BentoCard>

                <BentoCard className="p-6 bg-blue-50 border-blue-100">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white rounded-2xl shadow-sm text-blue-600">
                            <Timer className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-blue-700/60 uppercase tracking-widest">In Progress</p>
                            <p className="text-2xl font-black text-blue-900">{logs.filter(l => l.status?.toLowerCase().replace('-', '_') === 'in_progress').length}</p>
                        </div>
                    </div>
                </BentoCard>

                <BentoCard className="p-6 bg-emerald-50 border-emerald-100">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white rounded-2xl shadow-sm text-emerald-600">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-emerald-700/60 uppercase tracking-widest">Completed Today</p>
                            <p className="text-2xl font-black text-emerald-900">
                                {logs.filter(l => l.status?.toLowerCase() === 'completed' && l.completed_at && new Date(l.completed_at).toDateString() === new Date().toDateString()).length}
                            </p>
                        </div>
                    </div>
                </BentoCard>
            </div>

            <BentoCard className="overflow-hidden border-slate-200">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Room</th>
                                <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Assigned Staff</th>
                                <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest">Time Logs</th>
                                <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Duration</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {logs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="p-5">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-white transition-colors">
                                                <BedDouble className="w-4 h-4 text-slate-600" />
                                            </div>
                                            <span className="font-black text-slate-900 text-lg">{log.rooms?.number}</span>
                                        </div>
                                    </td>
                                    <td className="p-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                                {log.profiles?.name?.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="font-bold text-slate-700">{log.profiles?.name}</span>
                                        </div>
                                    </td>
                                    <td className="p-5">
                                        <div className="flex items-center gap-3">
                                            <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border", getStatusStyle(log.status))}>
                                                {log.status}
                                            </span>
                                            <StatusButtons assignmentId={log.id} status={log.status} />
                                        </div>
                                    </td>
                                    <td className="p-5">
                                        <div className="space-y-1">
                                            <p className="text-xs text-slate-400">
                                                <span className="font-bold text-slate-500">Assigned:</span> {formatDistanceToNow(new Date(log.assigned_at), { addSuffix: true })}
                                            </p>
                                            {log.started_at && (
                                                <p className="text-xs text-slate-400">
                                                    <span className="font-bold text-blue-500">Started:</span> {formatDistanceToNow(new Date(log.started_at), { addSuffix: true })}
                                                </p>
                                            )}
                                            {log.completed_at && (
                                                <p className="text-xs text-slate-400">
                                                    <span className="font-bold text-emerald-500">Finished:</span> {formatDistanceToNow(new Date(log.completed_at), { addSuffix: true })}
                                                </p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-5 text-right">
                                        {log.status === 'completed' ? (
                                            <div className="inline-flex flex-col items-end">
                                                <span className="text-sm font-black text-slate-900">{calculateDuration(log.started_at, log.completed_at)}</span>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Clean Time</span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-300 font-bold italic underline decoration-slate-200 underline-offset-4 tracking-wider">Tipping Point...</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {logs.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <History className="w-12 h-12 text-slate-200" />
                                            <p className="text-slate-400 font-bold text-lg">No cleaning activity found yet.</p>
                                            <p className="text-slate-300 text-sm">Assignments made from the Front Desk will appear here.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </BentoCard>
        </div>
    );
}
