'use client';

import { useState, useEffect } from 'react';
import { BentoCard } from '@/components/ui/BentoCard';
import { BedDouble, CheckCircle2, Timer, History, User, CalendarRange, Clock, Loader2, PlayCircle } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { getStaffTasks, updateCleaningStatus } from '@/app/actions/housekeeping';
import { toast } from 'sonner';
import { BookingTapeChart } from '@/app/(dashboard)/admin/BookingTapeChart';

interface Task {
    id: string;
    room_id: string;
    status: string;
    assigned_at: string;
    started_at: string | null;
    completed_at: string | null;
    rooms: {
        number: string;
        type: string;
    };
}

export function StaffDashboard({ staffId, staffName }: { staffId: string, staffName: string }) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);

    useEffect(() => {
        fetchTasks();
    }, [staffId]);

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const data = await getStaffTasks(staffId);
            setTasks(data as any);
        } catch (e) {
            toast.error('Failed to load tasks');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (assignmentId: string, newStatus: 'in_progress' | 'completed') => {
        setUpdating(assignmentId);
        try {
            await updateCleaningStatus(assignmentId, newStatus);
            toast.success(`Task marked as ${newStatus.replace('_', ' ')}`);
            await fetchTasks();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setUpdating(null);
        }
    };

    const pendingTasks = tasks.filter(t => t.status?.trim().toLowerCase() !== 'completed');
    const completedTasks = tasks.filter(t => t.status?.trim().toLowerCase() === 'completed');

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20 w-full bg-slate-50/30 min-h-screen">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                    <p className="text-slate-400 font-bold animate-pulse">Loading assigned tasks...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8 w-full max-w-[1600px] mx-auto pb-10">
            {/* Profile Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Welcome, {staffName}</h1>
                    <p className="text-slate-500 font-medium">Here are your cleaning assignments for today.</p>
                </div>
                <div className="flex items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-xl">
                        {staffName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="font-bold text-slate-900">{staffName}</p>
                        <p className="text-xs font-bold text-amber-600 uppercase tracking-widest">Housekeeping Staff</p>
                    </div>
                </div>
            </div>

            {/* Active Tasks Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Timer className="w-5 h-5 text-blue-600" /> Active Assignments
                    </h2>
                    <div className="grid gap-4">
                        {pendingTasks.length > 0 ? pendingTasks.map(task => {
                            const room = Array.isArray(task.rooms) ? task.rooms[0] : (task.rooms as any);
                            const status = task.status?.trim().toLowerCase();

                            return (
                                <BentoCard key={task.id} className={cn(
                                    "p-5 border-l-4 transition-all",
                                    status === 'in_progress' ? "border-l-blue-600 bg-blue-50/50 shadow-blue-100" : "border-l-orange-500 bg-orange-50/50 shadow-orange-100"
                                )}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-white rounded-xl shadow-sm">
                                                <BedDouble className="w-6 h-6 text-slate-600" />
                                            </div>
                                            <div>
                                                <p className="text-2xl font-black text-slate-900">Room {room?.number || task.room_id || 'N/A'}</p>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{room?.type || 'Standard Room'}</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-2">
                                            <span className={cn(
                                                "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                                                status === 'in_progress' ? "bg-blue-600 text-white border-blue-700" : "bg-orange-600 text-white border-orange-700"
                                            )}>
                                                {task.status || 'Pending'}
                                            </span>
                                            <div className="flex gap-2">
                                                {(status === 'pending' || !status) && (
                                                    <button
                                                        onClick={() => handleStatusUpdate(task.id, 'in_progress')}
                                                        disabled={!!updating}
                                                        className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm shadow-xl shadow-slate-200 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 ring-2 ring-white"
                                                    >
                                                        {updating === task.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                                                        Start Cleaning
                                                    </button>
                                                )}
                                                {status === 'in_progress' && (
                                                    <button
                                                        onClick={() => handleStatusUpdate(task.id, 'completed')}
                                                        disabled={!!updating}
                                                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-xl shadow-emerald-200 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 ring-2 ring-white"
                                                    >
                                                        {updating === task.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                                        Mark Done
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500 font-bold">
                                        <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Assigned {formatDistanceToNow(new Date(task.assigned_at), { addSuffix: true })}</span>
                                        {task.started_at && <span className="flex items-center gap-1.5 text-blue-600"><Timer className="w-3.5 h-3.5" /> Started {formatDistanceToNow(new Date(task.started_at), { addSuffix: true })}</span>}
                                    </div>
                                </BentoCard>
                            );
                        }) : (
                            <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                                <p className="font-bold text-slate-600">All caught up!</p>
                                <p className="text-sm text-slate-400">No pending cleaning tasks assigned to you right now.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <History className="w-5 h-5 text-slate-600" /> Recent History
                    </h2>
                    <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2">
                        {completedTasks.length > 0 ? completedTasks.map(task => {
                            const room = Array.isArray(task.rooms) ? task.rooms[0] : (task.rooms as any);
                            return (
                                <div key={task.id} className="p-4 bg-white rounded-xl border border-slate-100 flex items-center justify-between group hover:border-slate-200 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-emerald-50 transition-colors">
                                            <BedDouble className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800">Room {room?.number || 'N/A'}</p>
                                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{task.completed_at ? format(new Date(task.completed_at), 'MMM dd, h:mm a') : 'Recently'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] font-black text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded-full">Completed</span>
                                    </div>
                                </div>
                            );
                        }) : (
                            <p className="text-center py-10 text-slate-400 text-sm italic">No completed tasks yet.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Tape Chart / Timeline */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <CalendarRange className="w-5 h-5 text-indigo-600" /> Booking Chart
                </h2>
                <div className="rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-white">
                    <BookingTapeChart />
                </div>
            </div>
        </div>
    );
}
