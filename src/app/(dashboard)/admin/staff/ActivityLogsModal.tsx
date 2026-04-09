'use client';

import { useState } from 'react';
import { Clock, Loader2, X, Activity, User, CalendarCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { getStaffActivityLogs, AuditLogEntry } from './actions-logs';
import { getStaffAttendanceLogs, AttendanceRecord } from './actions-attendance';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { createPortal } from 'react-dom';

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    present: { label: 'Present', bg: 'bg-emerald-500', text: 'text-white', dot: 'bg-emerald-500' },
    absent: { label: 'Absent', bg: 'bg-rose-500', text: 'text-white', dot: 'bg-rose-500' },
    late: { label: 'Late', bg: 'bg-amber-400', text: 'text-white', dot: 'bg-amber-400' },
    half_day: { label: 'Half Day', bg: 'bg-blue-400', text: 'text-white', dot: 'bg-blue-400' },
};

function AttendanceCalendar({ attendance }: { attendance: AttendanceRecord[] }) {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Build a lookup map: date string (YYYY-MM-DD) → record
    const recordMap = new Map<string, AttendanceRecord>();
    attendance.forEach(r => {
        const key = r.date.split('T')[0]; // trim any time component
        recordMap.set(key, r);
    });

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Mon
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    // Build 6-week grid
    const days: Date[] = [];
    let d = calStart;
    while (d <= calEnd) {
        days.push(d);
        d = addDays(d, 1);
    }

    // Stats for this month
    const monthRecords = attendance.filter(r => {
        const rd = new Date(r.date);
        return isSameMonth(rd, currentMonth);
    });
    const counts = { present: 0, absent: 0, late: 0, half_day: 0 };
    monthRecords.forEach(r => { counts[r.status as keyof typeof counts] = (counts[r.status as keyof typeof counts] || 0) + 1; });

    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return (
        <div className="space-y-4">
            {/* Month Nav */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <h3 className="text-sm font-bold text-slate-800">{format(currentMonth, 'MMMM yyyy')}</h3>
                <button
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* Month Stats */}
            <div className="grid grid-cols-4 gap-2 text-center">
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <div key={key} className="bg-slate-50 rounded-xl p-2 border border-slate-100">
                        <span className="text-lg font-bold text-slate-900">{counts[key as keyof typeof counts] || 0}</span>
                        <p className="text-[10px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: key === 'present' ? '#059669' : key === 'absent' ? '#e11d48' : key === 'late' ? '#d97706' : '#3b82f6' }}>{cfg.label}</p>
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="rounded-2xl border border-slate-100 overflow-hidden">
                {/* Day headers */}
                <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100">
                    {weekDays.map(day => (
                        <div key={day} className="py-2 text-center text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7 bg-white">
                    {days.map((day, idx) => {
                        const key = format(day, 'yyyy-MM-dd');
                        const record = recordMap.get(key);
                        const isCurrentMonth = isSameMonth(day, currentMonth);
                        const isToday = isSameDay(day, new Date());
                        const cfg = record ? STATUS_CONFIG[record.status] : null;

                        return (
                            <div
                                key={idx}
                                className={`relative min-h-[52px] p-1.5 border-b border-r border-slate-50 flex flex-col items-center gap-1 
                                    ${!isCurrentMonth ? 'opacity-25' : ''}
                                    ${isToday ? 'bg-teal-50/60' : ''}`}
                                title={record ? `${format(day, 'dd MMM')} — ${cfg?.label}${record.check_in_time ? '\nIn: ' + format(new Date(record.check_in_time), 'h:mm a') : ''}${record.check_out_time ? ' • Out: ' + format(new Date(record.check_out_time), 'h:mm a') : ''}` : undefined}
                            >
                                <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full
                                    ${isToday ? 'bg-teal-600 text-white' : 'text-slate-600'}`}>
                                    {format(day, 'd')}
                                </span>
                                {cfg && isCurrentMonth && (
                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center ${cfg.bg} shadow-sm`} title={cfg.label}>
                                        <span className="text-[8px] font-bold text-white">
                                            {cfg.label[0]}
                                        </span>
                                    </span>
                                )}
                                {record && isCurrentMonth && record.check_in_time && (
                                    <span className="text-[8px] text-slate-400 leading-none">
                                        ↑{format(new Date(record.check_in_time), 'h:mma')}
                                    </span>
                                )}
                                {record && isCurrentMonth && record.check_out_time && (
                                    <span className="text-[8px] text-slate-400 leading-none">
                                        ↓{format(new Date(record.check_out_time), 'h:mma')}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 justify-center pt-1">
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <div key={key} className="flex items-center gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                        <span className="text-[11px] text-slate-500 font-medium">{cfg.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

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
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [activeTab, setActiveTab] = useState<'logs' | 'attendance'>('logs');

    const fetchLogs = async () => {
        setIsLoading(true);
        const [resLogs, resAttendance] = await Promise.all([
            getStaffActivityLogs(staffId),
            getStaffAttendanceLogs(staffId)
        ]);

        if (resLogs.success && resLogs.logs) {
            setLogs(resLogs.logs);
        } else {
            toast.error(resLogs.error || 'Failed to fetch activity logs');
        }

        if (resAttendance.success && resAttendance.records) {
            setAttendance(resAttendance.records);
        } else {
            toast.error(resAttendance.error || 'Failed to fetch attendance');
        }
        setIsLoading(false);
    };

    const handleOpen = () => {
        setIsOpen(true);
        fetchLogs();
    };

    const getLogDetails = (log: AuditLogEntry) => {
        const action = log.action || 'Unknown Action';
        let displayAction = action;
        let colorClass = "bg-slate-100 text-slate-700";

        if (action === 'login') { displayAction = 'Logged In'; colorClass = "bg-emerald-100 text-emerald-700"; }
        else if (action === 'logout') { displayAction = 'Logged Out'; colorClass = "bg-amber-100 text-amber-700"; }
        else if (action === 'account_created') { displayAction = 'Account Created'; colorClass = "bg-teal-100 text-teal-700"; }
        else if (action === 'profile_updated') { displayAction = 'Profile Updated'; colorClass = "bg-blue-100 text-blue-700"; }
        else { displayAction = action.charAt(0).toUpperCase() + action.slice(1); }

        return { displayAction, colorClass };
    };

    return (
        <>
            <div onClick={handleOpen} className="cursor-pointer hover:opacity-80 transition-opacity w-fit">
                {trigger}
            </div>

            {isOpen && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm w-screen h-screen">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200 my-auto">
                        {/* Header */}
                        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100 bg-slate-50/50 shrink-0">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <User className="w-5 h-5 text-teal-600" />
                                    User Profile & Activity
                                </h3>
                                <p className="text-sm text-slate-500 mt-0.5">Showing records for {staffName}</p>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex px-6 pt-3 gap-6 border-b border-slate-100 shrink-0">
                            <button
                                onClick={() => setActiveTab('logs')}
                                className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'logs' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                <Clock className="w-4 h-4" /> Activity Logs
                            </button>
                            <button
                                onClick={() => setActiveTab('attendance')}
                                className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'attendance' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                <CalendarCheck className="w-4 h-4" /> Attendance Calendar
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                    <Loader2 className="w-8 h-8 animate-spin text-teal-600 mb-4" />
                                    <p className="text-sm">Loading records...</p>
                                </div>
                            ) : activeTab === 'logs' ? (
                                logs.length === 0 ? (
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
                                                    <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-teal-500 ring-4 ring-white" />
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${colorClass}`}>{displayAction}</span>
                                                            <span className="text-xs font-medium text-slate-400">{format(date, 'MMM d, yyyy • h:mm a')}</span>
                                                        </div>
                                                        {log.details && (
                                                            <div className="bg-slate-50 rounded-xl p-3 mt-1 border border-slate-100 text-xs text-slate-600">
                                                                {log.details}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )
                            ) : (
                                attendance.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center">
                                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                                            <CalendarCheck className="w-6 h-6 text-slate-300" />
                                        </div>
                                        <h4 className="text-slate-900 font-medium mb-1">No attendance data yet</h4>
                                        <p className="text-sm">Their mobile app check-ins will appear here.</p>
                                    </div>
                                ) : (
                                    <AttendanceCalendar attendance={attendance} />
                                )
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
