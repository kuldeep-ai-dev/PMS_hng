import { createClient } from '@supabase/supabase-js';
import { BentoCard } from '@/components/ui/BentoCard';
import { ShieldAlert, Users, Plus, Mail, BadgeCheck, Pencil, MoreVertical, Clock, Circle, CreditCard } from 'lucide-react';
import Link from 'next/link';
import StaffClientUI from './StaffClientUI';
import ActivityLogsModal from './ActivityLogsModal';
import IdCardModal from './IdCardModal';
import { formatDistanceToNow, format } from 'date-fns';
import { getDailyAttendanceStats } from './actions-attendance';
import fs from 'fs/promises';
import path from 'path';

export const revalidate = 30;

export default async function StaffManagementPage() {
    // We use the admin client to fetch user emails (which are strictly in the auth schema)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1-4. Parallel Data Fetching: Auth, Profiles, Activity, and Settings
    const [
        { data: authData, error: authError },
        { data: profiles, error: profilesError },
        { data: activityLogs },
        { stats: attendanceStats },
        hotelSettings
    ] = await Promise.all([
        supabaseAdmin.auth.admin.listUsers(),
        supabaseAdmin.from('profiles').select('*').order('created_at', { ascending: false }),
        supabaseAdmin.from('staff_activity_logs').select('staff_id, action, created_at').order('created_at', { ascending: false }),
        getDailyAttendanceStats(),
        (async () => {
            try {
                const SETTINGS_PATH = path.resolve(process.cwd(), 'src/data/hotel-settings.json');
                const data = await fs.readFile(SETTINGS_PATH, 'utf-8');
                return JSON.parse(data);
            } catch (e) {
                return { hotel_name: 'My Hotel', phone: '', email: '', address: '', logo_url: '' };
            }
        })()
    ]);

    if (authError || profilesError) {
        return (
            <div className="max-w-6xl mx-auto p-6">
                <BentoCard className="p-12 text-center text-rose-600 bg-rose-50 border-rose-200">
                    <ShieldAlert className="w-12 h-12 mx-auto mb-4" />
                    <h2 className="text-xl font-bold">Error Loading Staff Data</h2>
                    <p className="mt-2 text-sm text-rose-500">
                        Please ensure you have configured the <code>SUPABASE_SERVICE_ROLE_KEY</code> in your environment variables.
                    </p>
                </BentoCard>
            </div>
        );
    }

    // Map users together
    const authUsers = authData?.users || [];

    // Merge profiles with their auth emails and latest activity status
    const staffMembers = (profiles || []).map((profile: any) => {
        const authRecord = authUsers.find((u: any) => u.id === profile.id);

        // Find their most recent log locally
        const latestLog = activityLogs?.find((l: any) => l.staff_id === profile.id);

        let isOnline = false;
        let lastActivity = authRecord?.last_sign_in_at || null;

        if (latestLog) {
            lastActivity = latestLog.created_at;
            if (latestLog.action === 'logout') {
                // Explicit logout = definitely offline
                isOnline = false;
            } else if (latestLog.action === 'login') {
                // Still in an active login session (no logout since)
                const diffInHours = (new Date().getTime() - new Date(latestLog.created_at).getTime()) / 1000 / 3600;
                isOnline = diffInHours < 12; // Session older than 12h is considered expired
            } else {
                // Any other activity (page visit, action, etc.) within 90 mins = online
                const diffInMinutes = (new Date().getTime() - new Date(latestLog.created_at).getTime()) / 1000 / 60;
                isOnline = diffInMinutes < 90;
            }
        } else {
            // Fallback to auth record if no custom logs exist yet
            if (lastActivity) {
                const diffInMinutes = (new Date().getTime() - new Date(lastActivity).getTime()) / 1000 / 60;
                isOnline = diffInMinutes < 60;
            }
        }

        return {
            ...profile,
            email: authRecord?.email || 'No email',
            last_activity_at: lastActivity,
            isOnline,
        };
    }).filter((staff: any) => staff.role !== 'master');

    // Role display mapping
    const roleLabels: Record<string, string> = {
        'admin': 'Administrator',
        'manager': 'Manager',
        'front_desk': 'Front Desk',
        'restaurant_staff': 'Restaurant',
        'cleaning_staff': 'Housekeeping',
    };

    const roleColors: Record<string, string> = {
        'admin': 'bg-indigo-100 text-indigo-700',
        'manager': 'bg-blue-100 text-blue-700',
        'front_desk': 'bg-teal-100 text-teal-700',
        'restaurant_staff': 'bg-orange-100 text-orange-700',
        'cleaning_staff': 'bg-amber-100 text-amber-700',
    };

    return (
        <div className="max-w-6xl mx-auto flex flex-col gap-6 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <Users className="w-6 h-6 text-teal-600" />
                        Staff Management
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Manage team members, roles, and access credentials.</p>
                </div>
            </div>

            {/* Attendance Analytics */}
            <div className="grid grid-cols-4 gap-4">
                <BentoCard className="p-4 flex flex-col gap-1 bg-white">
                    <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Staff</span>
                    <span className="text-2xl font-bold text-slate-900">{staffMembers.length}</span>
                </BentoCard>
                <BentoCard className="p-4 flex flex-col gap-1 bg-emerald-50 border-emerald-100 shadow-sm">
                    <span className="text-xs text-emerald-600 font-medium uppercase tracking-wider">Present Today</span>
                    <span className="text-2xl font-bold text-emerald-700">{attendanceStats?.present || 0}</span>
                </BentoCard>
                <BentoCard className="p-4 flex flex-col gap-1 bg-amber-50 border-amber-100 shadow-sm">
                    <span className="text-xs text-amber-600 font-medium uppercase tracking-wider">Late / Half Day</span>
                    <span className="text-2xl font-bold text-amber-700">{(attendanceStats?.late || 0) + (attendanceStats?.half_day || 0)}</span>
                </BentoCard>
                <BentoCard className="p-4 flex flex-col gap-1 bg-rose-50 border-rose-100 shadow-sm">
                    <span className="text-xs text-rose-600 font-medium uppercase tracking-wider">Absent</span>
                    <span className="text-2xl font-bold text-rose-700">{attendanceStats?.absent || 0}</span>
                </BentoCard>
            </div>

            <BentoCard className="p-0 shadow-sm relative z-0">
                <div className="w-full">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                                <th className="px-6 py-4">Staff Member</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Status & Activity</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {staffMembers.map((staff: any) => (
                                <tr key={staff.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 shrink-0">
                                        <div className="flex items-center gap-4">
                                            {staff.photo_url ? (
                                                <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-slate-200">
                                                    {/* We use standard img to avoid tricky remote domain hostname config for next/image right now */}
                                                    <img src={staff.photo_url} alt={staff.name} className="w-full h-full object-cover" />
                                                </div>
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm shrink-0">
                                                    {staff.name.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-semibold text-slate-900 text-sm">{staff.name}</p>
                                                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                    <Mail className="w-3 h-3" /> {staff.email}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${roleColors[staff.role] || 'bg-slate-100 text-slate-700'}`}>
                                            {roleLabels[staff.role] || staff.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                <ActivityLogsModal
                                                    staffId={staff.id}
                                                    staffName={staff.name}
                                                    trigger={
                                                        staff.isOnline ? (
                                                            <span className="flex items-center gap-1.5 text-emerald-600 font-semibold whitespace-nowrap">
                                                                <span className="relative flex h-2 w-2">
                                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                                </span>
                                                                Online
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1 whitespace-nowrap hover:text-teal-600 transition-colors">
                                                                <Clock className="w-3 h-3" />
                                                                {staff.last_activity_at
                                                                    ? format(new Date(staff.last_activity_at), "MMM d, yyyy - hh:mm a")
                                                                    : 'Never logged in'}
                                                            </span>
                                                        )
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <IdCardModal
                                                staff={staff}
                                                settings={hotelSettings}
                                                trigger={
                                                    <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all tooltip-trigger" title="Generate ID Card">
                                                        <CreditCard className="w-4 h-4" />
                                                    </button>
                                                }
                                            />
                                            <StaffClientUI
                                                staff={{
                                                    id: staff.id,
                                                    name: staff.name,
                                                    email: staff.email,
                                                    role: staff.role,
                                                    status: staff.status,
                                                    photo_url: staff.photo_url,
                                                    phone: staff.phone,
                                                    address: staff.address
                                                }}
                                                mode="edit"
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {staffMembers.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500 text-sm">
                                        No staff members found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </BentoCard>

            {/* The main Add Staff button / Drawer Component */}
            <div className="fixed bottom-6 right-6 z-40">
                <StaffClientUI mode="add" />
            </div>
        </div>
    );
}
