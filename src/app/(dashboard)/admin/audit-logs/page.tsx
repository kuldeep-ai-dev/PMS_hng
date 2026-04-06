import { createClient } from '@/utils/supabase/server';
import { BentoCard } from '@/components/ui/BentoCard';
import { FileJson, FileText, Calendar, Building2, User, Hash } from 'lucide-react';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function AuditLogsPage() {
    const supabase = await createClient();

    // Verify Admin rights
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return <div>Unauthorized</div>;

    // Fetch all logs joined with profiles
    const { data: logs, error } = await supabase
        .from('night_audit_logs')
        .select(`
            id,
            audit_date,
            total_room_revenue,
            total_occupancy,
            created_at,
            profiles ( name, role )
        `)
        .order('audit_date', { ascending: false });

    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
            <div className="space-y-2">
                <h1 className="text-3xl font-black tracking-tight text-slate-800">Daily Audit Logs Archive</h1>
                <p className="text-slate-500 font-medium max-w-3xl">
                    Historical repository of previously closed business days. Download past Manager Flash Reports here.
                </p>
            </div>

            <BentoCard className="flex flex-col bg-white overflow-hidden shadow-sm border border-slate-200">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[13px] uppercase tracking-wider font-bold">
                                <th className="p-4 px-6 whitespace-nowrap">Business Date</th>
                                <th className="p-4 px-6 whitespace-nowrap">Executed By</th>
                                <th className="p-4 px-6 whitespace-nowrap">Total Revenue</th>
                                <th className="p-4 px-6 whitespace-nowrap">Occupancy</th>
                                <th className="p-4 px-6 whitespace-nowrap text-right">Flash Reports</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[15px]">
                            {!logs || logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-10 text-center text-slate-500">
                                        <Calendar className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                                        <p>No Daily Audit logs found in the archives.</p>
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log: any) => {
                                    const profile = log.profiles || {};
                                    return (
                                        <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4 px-6 font-bold text-slate-800 flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                                    <Calendar className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    {log.audit_date}
                                                    <div className="text-xs text-slate-400 font-medium tracking-tight">
                                                        Executed: {format(new Date(log.created_at), 'dd MMM yyyy HH:mm')}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 px-6">
                                                <div className="flex items-center gap-2 font-semibold text-slate-700">
                                                    <User className="w-4 h-4 text-slate-400" />
                                                    {profile.name || 'System Admin'}
                                                </div>
                                                <div className="text-xs text-slate-500 uppercase tracking-wider mt-0.5 ml-6">
                                                    {profile.role || 'Admin'}
                                                </div>
                                            </td>
                                            <td className="p-4 px-6">
                                                <div className="font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded inline-block">
                                                    ₹{Number(log.total_room_revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </div>
                                            </td>
                                            <td className="p-4 px-6">
                                                <div className="flex items-center gap-2 font-medium text-slate-700">
                                                    <Hash className="w-4 h-4 text-slate-400" />
                                                    {log.total_occupancy} Rooms
                                                </div>
                                            </td>
                                            <td className="p-4 px-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <a
                                                        href={`/api/night-audit/report?date=${log.audit_date}&format=json`}
                                                        target="_blank"
                                                        className="p-2 border border-slate-200 text-slate-500 rounded-lg hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition tooltip-trigger"
                                                        title="Download raw JSON"
                                                    >
                                                        <FileJson className="w-4 h-4" />
                                                    </a>
                                                    <a
                                                        href={`/api/night-audit/report?date=${log.audit_date}&format=pdf`}
                                                        target="_blank"
                                                        className="p-2 border border-slate-200 text-slate-500 rounded-lg hover:border-red-500 hover:text-red-600 hover:bg-red-50 transition tooltip-trigger"
                                                        title="Download Premium PDF Report"
                                                    >
                                                        <FileText className="w-4 h-4" />
                                                    </a>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </BentoCard>
        </div>
    );
}
