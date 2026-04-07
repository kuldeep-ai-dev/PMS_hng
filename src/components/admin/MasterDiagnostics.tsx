'use client';

import { useState } from 'react';
import { runFullDiagnostic, DiagnosticResult } from '@/app/actions/diagnostics';
import {
    Activity,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Loader2,
    Zap,
    Server,
    Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function MasterDiagnostics() {
    const [status, setStatus] = useState<'idle' | 'running' | 'complete'>('idle');
    const [results, setResults] = useState<DiagnosticResult[]>([]);

    const handleRunDiagnostics = async () => {
        setStatus('running');
        setResults([]);

        try {
            const data = await runFullDiagnostic();
            setResults(data);
            setStatus('complete');

            const failures = data.filter(r => r.status === 'unhealthy');
            if (failures.length > 0) {
                toast.error(`${failures.length} system failures detected!`);
            } else {
                toast.success('All systems operational!');
            }
        } catch (err) {
            toast.error('Diagnostic engine failure');
            setStatus('idle');
        }
    };

    return (
        <div className="bg-white border border-slate-200 rounded-[40px] p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-slate-100 text-slate-900 rounded-2xl">
                        <Server className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">System Core</h2>
                </div>
                {status === 'complete' && (
                    <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                        Scan Complete
                    </span>
                )}
            </div>

            <div className="space-y-4">
                {status === 'idle' ? (
                    <>
                        <p className="text-sm text-slate-500 font-medium leading-relaxed mb-6">
                            Run a deep scan of all integrated cloud services and internal database modules to ensure full operational integrity.
                        </p>
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between opacity-50">
                            <span className="text-sm font-bold text-slate-700">R2 Connector</span>
                            <span className="text-[10px] font-black uppercase text-slate-400">Waiting</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between opacity-50">
                            <span className="text-sm font-bold text-slate-700">WhatsApp API</span>
                            <span className="text-[10px] font-black uppercase text-slate-400">Waiting</span>
                        </div>
                    </>
                ) : (
                    <div className="space-y-3">
                        {status === 'running' && results.length === 0 && (
                            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                                <p className="text-sm font-bold text-slate-800 animate-pulse tracking-tight uppercase">Initializing Diagnostic Protocols...</p>
                                <p className="text-[10px] text-slate-400 font-medium">Checking encrypted endpoints & cloud handshakes</p>
                            </div>
                        )}

                        {results.map((res) => (
                            <div
                                key={res.service}
                                className={cn(
                                    "p-4 rounded-2xl border transition-all duration-300",
                                    res.status === 'healthy' ? "bg-emerald-50/50 border-emerald-100" :
                                        res.status === 'unhealthy' ? "bg-red-50/50 border-red-100" :
                                            "bg-amber-50/50 border-amber-100"
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        {res.status === 'healthy' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                        {res.status === 'unhealthy' && <XCircle className="w-4 h-4 text-red-500" />}
                                        {res.status === 'warning' && <AlertCircle className="w-4 h-4 text-amber-500" />}
                                        <span className="text-sm font-bold text-slate-800">{res.service}</span>
                                    </div>
                                    {res.latency && (
                                        <span className="text-[10px] font-bold text-slate-400 font-mono">
                                            {res.latency}ms
                                        </span>
                                    )}
                                </div>
                                <p className={cn(
                                    "text-[10px] mt-1.5 font-medium ml-7",
                                    res.status === 'healthy' ? "text-emerald-600" :
                                        res.status === 'unhealthy' ? "text-red-600" :
                                            "text-amber-600"
                                )}>
                                    {res.message}
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                <button
                    onClick={handleRunDiagnostics}
                    disabled={status === 'running'}
                    className={cn(
                        "w-full mt-4 py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg",
                        status === 'running'
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                            : "bg-slate-900 hover:bg-slate-800 text-white hover:scale-[1.02] shadow-slate-200"
                    )}
                >
                    {status === 'running' ? (
                        <span className="flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Scanning...
                        </span>
                    ) : status === 'complete' ? (
                        "Restart Diagnostic"
                    ) : (
                        "Perform Full Diagnostic"
                    )}
                </button>
            </div>
        </div>
    );
}
