'use client';

import React, { useState, useEffect } from 'react';
import { getSystemActivityLogs, type SystemLog } from '@/app/actions/activity';
import {
    Terminal,
    Search,
    Filter,
    Calendar,
    Clock,
    User,
    Database,
    Zap,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    FileJson,
    RefreshCcw,
    LayoutGrid,
    History
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function SystemLogsPage() {
    const [logs, setLogs] = useState<SystemLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedModule, setSelectedModule] = useState('all');
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        setLoading(true);
        const res = await getSystemActivityLogs({
            searchTerm: searchTerm || undefined,
            module: selectedModule === 'all' ? undefined : selectedModule
        });
        if (res.success) {
            setLogs(res.logs);
        }
        setLoading(false);
    };

    const toggleLog = (id: string) => {
        setExpandedLogId(expandedLogId === id ? null : id);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-32">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded">Developer Tool</span>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-widest rounded">
                            <Terminal className="w-3 h-3" />
                            System Audit Active
                        </div>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter">System Activity Logs</h1>
                    <p className="text-slate-500 font-medium tracking-tight">Real-time monitoring of every data mutation and backend event.</p>
                </div>
                <button
                    onClick={loadLogs}
                    className="p-4 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all text-slate-600 shadow-sm active:scale-95"
                >
                    <RefreshCcw className={cn("w-5 h-5", loading && "animate-spin")} />
                </button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search by description, table name, or event ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && loadLogs()}
                        className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-slate-900 transition-all outline-none shadow-sm"
                    />
                </div>
                <div className="relative group">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select
                        value={selectedModule}
                        onChange={(e) => setSelectedModule(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-slate-900 appearance-none focus:ring-2 focus:ring-slate-900 transition-all outline-none shadow-sm"
                    >
                        <option value="all">All Modules</option>
                        <option value="database">Database (Triggers)</option>
                        <option value="auth">Authentication</option>
                        <option value="license">License Core</option>
                        <option value="bookings">Bookings</option>
                        <option value="payments">Payments</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
            </div>

            {/* Logs List */}
            <div className="bg-white border border-slate-200 rounded-[40px] shadow-sm overflow-hidden">
                <div className="overflow-x-auto max-h-[calc(100vh-380px)] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                <th className="p-6">Timestamp & Event</th>
                                <th className="p-6">Module</th>
                                <th className="p-6">Description</th>
                                <th className="p-6">Actor</th>
                                <th className="p-6 text-right">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading && logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-20 text-center animate-pulse">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Scanning Archives...</p>
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-20 text-center">
                                        <AlertCircle className="w-8 h-8 text-slate-200 mx-auto mb-4" />
                                        <p className="text-xs font-black uppercase tracking-widest text-slate-300">No logs found matching criteria</p>
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <React.Fragment key={log.id}>
                                        <tr className={cn(
                                            "hover:bg-slate-50/80 transition-colors cursor-pointer group",
                                            expandedLogId === log.id && "bg-slate-50"
                                        )} onClick={() => toggleLog(log.id)}>
                                            <td className="p-6">
                                                <div className="flex items-center gap-4">
                                                    <div className={cn(
                                                        "p-3 rounded-xl",
                                                        log.event_type === 'ERROR' ? "bg-red-50 text-red-500" :
                                                            log.event_type === 'UPDATE' ? "bg-amber-50 text-amber-600" :
                                                                log.event_type === 'INSERT' ? "bg-emerald-50 text-emerald-600" :
                                                                    log.event_type === 'DELETE' ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                                                    )}>
                                                        {log.event_type === 'ERROR' ? <AlertCircle className="w-4 h-4" /> :
                                                            log.event_type === 'UPDATE' ? <History className="w-4 h-4" /> :
                                                                log.event_type === 'INSERT' ? <Zap className="w-4 h-4" /> :
                                                                    log.event_type === 'DELETE' ? <AlertCircle className="w-4 h-4" /> : <Terminal className="w-4 h-4" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black text-slate-900 mb-0.5">
                                                            {format(new Date(log.created_at), 'hh:mm:ss a')}
                                                        </p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                            {format(new Date(log.created_at), 'dd MMM yyyy')}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[9px] font-black uppercase tracking-widest rounded-lg border border-slate-200">
                                                    {log.module}
                                                </span>
                                            </td>
                                            <td className="p-6">
                                                <p className="text-xs font-bold text-slate-700 max-w-sm line-clamp-1">{log.description}</p>
                                                {log.table_name && (
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Table: <span className="text-indigo-500">{log.table_name}</span></p>
                                                )}
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center">
                                                        <User className="w-3 h-3 text-slate-500" />
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-600 truncate">{log.admin?.name || 'System / Trigger'}</span>
                                                </div>
                                            </td>
                                            <td className="p-6 text-right">
                                                <button className="p-2 hover:bg-white rounded-xl transition-all text-slate-400 group-hover:text-slate-900">
                                                    {expandedLogId === log.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                </button>
                                            </td>
                                        </tr>
                                        {expandedLogId === log.id && (
                                            <tr className="bg-slate-50/50 border-y border-slate-100 animate-in slide-in-from-top-4 duration-300">
                                                <td colSpan={5} className="p-10">
                                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                                        {/* Metadata and Details */}
                                                        <div className="space-y-6">
                                                            <div>
                                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                                                                    <FileJson className="w-3 h-3" /> Event Identity
                                                                </h4>
                                                                <div className="p-6 bg-white border border-slate-200 rounded-3xl space-y-3 font-mono text-[11px]">
                                                                    <div className="flex justify-between">
                                                                        <span className="text-slate-400">Log ID:</span>
                                                                        <span className="text-slate-900 font-bold">{log.id}</span>
                                                                    </div>
                                                                    <div className="flex justify-between">
                                                                        <span className="text-slate-400">Record ID:</span>
                                                                        <span className="text-slate-900 font-bold">{log.record_id || 'N/A'}</span>
                                                                    </div>
                                                                    <div className="flex justify-between">
                                                                        <span className="text-slate-400">Action:</span>
                                                                        <span className="px-2 py-0.5 bg-slate-900 text-white rounded-[4px]">{log.event_type}</span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 flex items-start gap-4">
                                                                <div className="p-3 bg-white rounded-2xl text-amber-600 shrink-0">
                                                                    <LayoutGrid className="w-5 h-5" />
                                                                </div>
                                                                <div>
                                                                    <h5 className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1 capitalize">{log.module} Event Context</h5>
                                                                    <p className="text-xs font-semibold text-amber-700 leading-relaxed">{log.description}</p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Snapshot Changes */}
                                                        <div className="space-y-4">
                                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                                                                <RefreshCcw className="w-3 h-3" /> Data Snapshot
                                                            </h4>
                                                            <div className="grid grid-cols-1 gap-4">
                                                                {log.payload_before && Object.keys(log.payload_before).length > 0 && (
                                                                    <div className="space-y-2">
                                                                        <span className="text-[9px] font-black text-red-400 uppercase tracking-[0.2em] ml-1">Previous State</span>
                                                                        <pre className="p-4 bg-slate-900 text-slate-300 rounded-2xl text-[10px] overflow-x-auto border border-slate-800 max-h-48">
                                                                            {JSON.stringify(log.payload_before, null, 2)}
                                                                        </pre>
                                                                    </div>
                                                                )}
                                                                {log.payload_after && Object.keys(log.payload_after).length > 0 && (
                                                                    <div className="space-y-2">
                                                                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em] ml-1">Current State</span>
                                                                        <pre className="p-4 bg-slate-900 text-slate-300 rounded-2xl text-[10px] overflow-x-auto border border-slate-800 max-h-48">
                                                                            {JSON.stringify(log.payload_after, null, 2)}
                                                                        </pre>
                                                                    </div>
                                                                )}
                                                                {!log.payload_before && !log.payload_after && (
                                                                    <div className="p-12 text-center bg-slate-100 rounded-3xl">
                                                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No snapshot available for this event</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
