import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { HardDrive, AlertTriangle } from 'lucide-react';
import { DataOpsClient } from '@/components/admin/DataOpsClient';

export const metadata = {
    title: 'Data Operations - Master Control',
};

export default async function DataOpsPage() {
    const supabase = await createClient();

    // Strict Security Check (Server-Side)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'master') {
        redirect('/'); // Instantly bounce non-masters
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-rose-200 pb-8">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-rose-900 text-white text-[10px] font-black uppercase tracking-widest rounded flex items-center gap-1.5">
                            <AlertTriangle className="w-3 h-3 text-rose-300" />
                            Level 5 Clearance
                        </span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Data Operations Hub</h1>
                    <p className="text-slate-500 font-medium tracking-tight">Destructive actions and remote cloud backups.</p>
                </div>
                <div className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                        <HardDrive className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Database</p>
                        <p className="text-sm font-black text-slate-800">Production (Live)</p>
                    </div>
                </div>
            </div>

            {/* Warning Banner */}
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
                <div className="p-2 bg-red-100 text-red-600 rounded-full shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-red-900">Warning: Highly Destructive Operations</h3>
                    <p className="text-xs text-red-800 mt-1 font-medium leading-relaxed">
                        The actions on this page can result in irrecoverable data loss. Ensure you have executed a Cloudflare R2 backup before performing any date-range purges or factory resets.
                    </p>
                </div>
            </div>

            {/* Client Component for Interactive Forms */}
            <DataOpsClient />
        </div>
    );
}

