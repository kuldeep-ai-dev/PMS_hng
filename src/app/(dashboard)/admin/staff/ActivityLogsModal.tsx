'use client';

import { useState } from 'react';
import { Clock, Loader2, X, Activity, Globe, Monitor, MapPin } from 'lucide-react';
import { getStaffActivityLogs, AuditLogEntry } from './actions-logs';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { createPortal } from 'react-dom';

export default function ActivityLogsModal({
    staffId,
    staffName,
    trigger
}: {
    staffId: string;
    staffName: string;
    trigger: React.ReactNode;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);

    const fetchLogs = async () => {
        setIsLoading(true);
        const res = await getStaffActivityLogs(staffId);
        if (res.success && res.logs) {
            setLogs(res.logs);
        } else {
            toast.error(res.error || 'Failed to fetch activity logs');
        }
        setIsLoading(false);
    };

    const handleOpen = () => {
        setIsOpen(true);
        fetchLogs();
    };

    // Helper to format payload data
    const getLogDetails = (log: AuditLogEntry) => {
        const action = log.action || 'Unknown Action';

        let displayAction = action;
        let icon = <Activity className="w-4 h-4 text-slate-400" />;
        let colorClass = "bg-slate-100 text-slate-700";

        if (action === 'login') {
            displayAction = 'Logged In';
            colorClass = "bg-emerald-100 text-emerald-700";
        } else if (action === 'logout') {
            displayAction = 'Logged Out';
            colorClass = "bg-amber-100 text-amber-700";
        } else if (action === 'account_created') {
            displayAction = 'Account Created';
            colorClass = "bg-teal-100 text-teal-700";
        } else if (action === 'profile_updated') {
            displayAction = 'Profile Updated';
            colorClass = "bg-blue-100 text-blue-700";
        } else {
            // Capitalize fallback
            displayAction = action.charAt(0).toUpperCase() + action.slice(1);
        }

        return { displayAction, colorClass, icon };
    };

    return (
        <>
            <div onClick={handleOpen} className="cursor-pointer hover:opacity-80 transition-opacity w-fit">
                {trigger}
            </div>

            {isOpen && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm w-screen h-screen">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200 my-auto">
                        {/* Header */}
                        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-teal-600" />
                                    Activity Logs
                                </h3>
                                <p className="text-sm text-slate-500 mt-0.5">Showing recent login and security events for {staffName}</p>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                    <Loader2 className="w-8 h-8 animate-spin text-teal-600 mb-4" />
                                    <p className="text-sm">Fetching security logs...</p>
                                </div>
                            ) : logs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center">
                                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                                        <Clock className="w-6 h-6 text-slate-300" />
                                    </div>
                                    <h4 className="text-slate-900 font-medium mb-1">No activity found</h4>
                                    <p className="text-sm">There are no recent security logs for this user.</p>
                                </div>
                            ) : (
                                <div className="relative border-l-2 border-slate-100 ml-4 space-y-8 pb-4">
                                    {logs.map((log) => {
                                        const { displayAction, colorClass } = getLogDetails(log);
                                        const date = new Date(log.created_at);

                                        return (
                                            <div key={log.id} className="relative pl-6">
                                                {/* Timeline dot */}
                                                <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-teal-500 ring-4 ring-white" />

                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${colorClass}`}>
                                                            {displayAction}
                                                        </span>
                                                        <span className="text-xs font-medium text-slate-400">
                                                            {format(date, 'MMM d, yyyy • h:mm a')}
                                                        </span>
                                                    </div>

                                                    {(log.details) && (
                                                        <div className="bg-slate-50 rounded-xl p-3 mt-1 border border-slate-100 text-xs text-slate-600 flex flex-wrap gap-4">
                                                            <span>{log.details}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
